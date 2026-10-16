"use client";

import { useCallback } from "react";
import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { useStore } from "@/lib/store";
import { buildArgs, resolveCompat, toCli } from "@/lib/buildArgs";
import { parseProbeLog, probeWithVideoElement } from "@/lib/probe";
import { baseName, extOf, parseTimestamp } from "@/lib/format";
import { ACCEPTED_EXT } from "@/lib/presets";
import { parseCommand } from "@/lib/command";
import { tr } from "@/lib/i18n";
import { recordJob } from "@/lib/site";
import type { MediaMeta, Settings, Trim } from "@/lib/types";

/* ------------------------------------------------------------------ *
 * Module-level singleton: one FFmpeg worker for the whole app.
 *
 * Two core flavours:
 *  - "mt": @ffmpeg/core-mt (needs crossOriginIsolated + SharedArrayBuffer). Faster for
 *          H.264/H.265, but must be given an explicit `-threads 4` (auto thread count
 *          crashes the pthread pool) and VP9 hangs on it → VP9 always uses "st".
 *  - "st": @ffmpeg/core, single-thread. Works everywhere.
 * If the MT core crashes mid-job we fall back to ST and re-run automatically.
 * ------------------------------------------------------------------ */
type Flavor = "st" | "mt";

let ffmpeg: FFmpeg | null = null;
let ffFlavor: Flavor | null = null;
let loading: Promise<FFmpeg> | null = null;
let loadingFlavor: Flavor | null = null;
let writtenInput: { file: File; name: string } | null = null;
const writtenExtras = new Map<string, File>(); // command-mode extra inputs already in the WASM FS
let probeSink: string[] | null = null; // while probing, logs are collected here
let cancelled = false;
let mtBroken = false; // set after an MT crash → stay on ST for this session
let crashReject: ((e: Error) => void) | null = null;

export const MT_THREADS = 4;
const CORE_VERSION = "0.12.10";
const CDN: Record<Flavor, string> = {
  st: `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`,
  mt: `https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@${CORE_VERSION}/dist/esm`,
};
const BASE = process.env.NEXT_PUBLIC_FFMPEG_BASE ?? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/ffmpeg`;

function mtAvailable(): boolean {
  if (process.env.NEXT_PUBLIC_FFMPEG_FORCE_ST === "1" || mtBroken) return false;
  return typeof window !== "undefined" && window.crossOriginIsolated === true && typeof SharedArrayBuffer !== "undefined";
}

/** Which core should run a job with these settings? */
function flavorFor(s?: Settings): Flavor {
  if (!mtAvailable()) return "st";
  if (s && resolveCompat(s).settings.vcodec.startsWith("libvpx")) return "st";
  return "mt";
}

class CoreCrash extends Error {}

function onLog(message: string) {
  const st = useStore.getState();

  // Worker crash → exec() would hang forever; reject the pending job instead.
  if (/worker sent an error|RuntimeError|null function or function signature mismatch/i.test(message)) {
    crashReject?.(new CoreCrash(message));
  }
  if (probeSink) {
    probeSink.push(message);
    return;
  }
  st.pushLog(message);
  if (st.status !== "processing") return;

  // Progress from FFmpeg stats line: "frame=  120 fps= 30 q=28.0 size=  1024KiB time=00:00:04.00 bitrate=..."
  const t = message.match(/time=\s*(-?[\d:.]+)/);
  const total = st.jobDuration ?? st.meta?.duration;
  if (t && total) {
    const cur = parseTimestamp(t[1]);
    if (Number.isFinite(cur) && cur >= 0) {
      const p = Math.min(0.999, cur / total);
      const elapsed = st.startedAt ? (Date.now() - st.startedAt) / 1000 : 0;
      const eta = p > 0.01 ? (elapsed * (1 - p)) / p : null;
      st.setProgress({ progress: Math.max(st.progress, p), eta });
    }
  }
  const sz = message.match(/size=\s*(\d+)\s*(k|K|Ki|M|Mi)?B/);
  if (sz) {
    const n = Number(sz[1]);
    const unit = (sz[2] || "").toLowerCase();
    st.setProgress({ liveSize: unit.startsWith("m") ? n * 1024 * 1024 : unit.startsWith("k") ? n * 1024 : n });
  }
}

function dispose() {
  try {
    ffmpeg?.terminate();
  } catch {}
  ffmpeg = null;
  ffFlavor = null;
  loading = null;
  loadingFlavor = null;
  writtenInput = null;
  writtenExtras.clear();
  useStore.getState().setEngine({ loaded: false });
}

async function loadEngine(want: Flavor = flavorFor()): Promise<FFmpeg> {
  if (ffmpeg && ffFlavor === want) return ffmpeg;
  if (loading && loadingFlavor === want) return loading;
  if (loading) await loading.catch(() => {});
  if (ffmpeg && ffFlavor !== want) dispose(); // switch core flavour

  loadingFlavor = want;
  loading = (async () => {
    const st = useStore.getState();
    const prevStatus = st.status;
    if (prevStatus !== "processing") st.setStatus("loading-engine");
    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);

    const sources = [
      { label: "self-hosted", base: `${BASE}/${want}`, classWorker: `${window.location.origin}${BASE}/class/worker.js` },
      { label: "jsDelivr CDN", base: CDN[want], classWorker: `${window.location.origin}${BASE}/class/worker.js` },
    ];

    let lastErr: unknown = null;
    for (const src of sources) {
      try {
        const instance = new FFmpeg();
        instance.on("log", ({ message }) => onLog(message));
        instance.on("progress", ({ progress }) => {
          const s = useStore.getState();
          // Fallback when duration is unknown (log parsing can't compute %)
          if (s.status === "processing" && !(s.jobDuration ?? s.meta?.duration) && progress > 0 && progress <= 1) {
            s.setProgress({ progress: Math.max(s.progress, progress) });
          }
        });
        st.pushLog(`[engine] loading FFmpeg core (${want === "mt" ? `multi-thread ×${MT_THREADS}` : "single-thread"}) from ${src.label}…`);
        await instance.load({
          // Absolute URL → webpack can't rewrite it; worker.js runs as a native ES module.
          classWorkerURL: src.classWorker,
          coreURL: await toBlobURL(`${src.base}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${src.base}/ffmpeg-core.wasm`, "application/wasm"),
          ...(want === "mt" ? { workerURL: await toBlobURL(`${src.base}/ffmpeg-core.worker.js`, "text/javascript") } : {}),
        });
        ffmpeg = instance;
        ffFlavor = want;
        st.setEngine({ loaded: true, multiThread: want === "mt", source: src.label });
        st.pushLog(`[engine] ready ✓`);
        if (useStore.getState().status === "loading-engine") st.setStatus(st.file ? "ready" : "idle");
        return instance;
      } catch (e) {
        lastErr = e;
        st.pushLog(`[engine] ${src.label} failed: ${(e as Error)?.message ?? e}`);
      }
    }
    throw lastErr ?? new Error("Cannot load FFmpeg core");
  })();

  try {
    return await loading;
  } catch (e) {
    loading = null;
    loadingFlavor = null;
    throw e;
  }
}

async function ensureInput(ff: FFmpeg, file: File): Promise<string> {
  if (writtenInput?.file === file) return writtenInput.name;
  const { fetchFile } = await import("@ffmpeg/util");
  if (writtenInput) await ff.deleteFile(writtenInput.name).catch(() => {});
  const name = `input.${extOf(file.name) || "mp4"}`;
  await ff.writeFile(name, await fetchFile(file));
  writtenInput = { file, name };
  return name;
}

/** Write command-mode extra files (logo.png, music.mp3…) under their own names. */
async function ensureExtras(ff: FFmpeg, files: File[]): Promise<string[]> {
  const { fetchFile } = await import("@ffmpeg/util");
  const names: string[] = [];
  for (const f of files) {
    const name = f.name.split(/[\\/]/).pop() || f.name;
    if (writtenExtras.get(name) !== f) {
      await ff.writeFile(name, await fetchFile(f));
      writtenExtras.set(name, f);
    }
    names.push(name);
  }
  return names;
}

/** exec() that rejects (instead of hanging) if the core worker crashes. */
function guardedExec(ff: FFmpeg, args: string[]): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    crashReject = reject;
    ff.exec(args).then(resolve, reject);
  }).finally(() => {
    crashReject = null;
  });
}

/** Read metadata: instant <video> probe, then accurate `ffmpeg -i`. */
async function probeMeta(file: File): Promise<MediaMeta> {
  const quick = await probeWithVideoElement(file);
  const ff = await loadEngine(ffFlavor ?? flavorFor(useStore.getState().settings));
  const name = await ensureInput(ff, file);
  probeSink = [];
  await ff.exec(["-hide_banner", "-i", name]).catch(() => 1); // exits 1 (no output file) — expected
  const lines = probeSink;
  probeSink = null;
  const meta = parseProbeLog(lines, { name: file.name, size: file.size, type: file.type });
  if (!meta.duration && quick?.duration && Number.isFinite(quick.duration)) meta.duration = quick.duration;
  if (!meta.width && quick) { meta.width = quick.width; meta.height = quick.height; }
  return meta;
}

/** Pull the most useful FFmpeg error line out of the log. */
function exitError(code: number): string {
  const logs = useStore.getState().logs;
  const start = logs.map((l) => l.startsWith("$ ")).lastIndexOf(true);
  const recent = logs.slice(start + 1);
  const generic = /conversion failed|error while (opening|filtering)|exiting normally/i;
  const hit = recent.find((l) => /error|invalid|unrecognized|no such|not found|unknown|cannot|could not|does not|unable|failed|incorrect|undefined constant/i.test(l) && !generic.test(l))
    ?? recent.reverse().find((l) => /error|failed/i.test(l));
  return hit ? tr("err.exit", { code, line: hit.trim() }) : tr("err.exitGeneric", { code });
}

/* ------------------------------------------------------------------ *
 * Jobs
 * ------------------------------------------------------------------ */
interface Job {
  file: File;
  meta: MediaMeta | null;
  mode: "preset" | "command";
  settings: Settings;
  command: string;
  trim: Trim | null;
  extras: File[];
  /** Duration to size the bitrate for (target-size mode) — differs from trim during a 5-second test */
  rateDuration?: number;
}

type EncodeResult = { data: Uint8Array; mime: string; ext: string; name: string | null; elapsed: number };

async function execAndRead(ff: FFmpeg, args: string[], outName: string): Promise<{ data: Uint8Array; elapsed: number } | null> {
  const t0 = performance.now();
  const code = await guardedExec(ff, args);
  if (cancelled) return null;
  if (code !== 0) throw new Error(exitError(code));
  let data: Uint8Array;
  try {
    data = (await ff.readFile(outName)) as Uint8Array;
  } catch {
    throw new Error(tr("err.noOutput"));
  }
  await ff.deleteFile(outName).catch(() => {});
  return { data, elapsed: (performance.now() - t0) / 1000 };
}

async function encodePreset(job: Job, settings: Settings, flavor: Flavor): Promise<EncodeResult | null> {
  const st = useStore.getState();
  const ff = await loadEngine(flavor);
  const inputName = await ensureInput(ff, job.file);
  const cmd = buildArgs(inputName, baseName(job.file.name), settings, job.meta, flavor === "mt" ? MT_THREADS : undefined, job.trim, job.rateDuration);
  st.setJobDuration(job.trim ? job.trim.end - job.trim.start : job.meta?.duration ?? null);
  const cli = toCli(cmd.args, job.file.name);
  st.setCommand(cli);
  cmd.warnings.forEach((w) => st.pushLog(`[warn] ${w}`));
  st.pushLog(`$ ${cli}`);
  const out = await execAndRead(ff, cmd.args, cmd.outName);
  return out && { ...out, mime: cmd.mime, ext: cmd.ext, name: null };
}

async function encodeCustom(job: Job, flavor: Flavor): Promise<EncodeResult | null> {
  const st = useStore.getState();
  const ff = await loadEngine(flavor);
  const inputName = await ensureInput(ff, job.file);
  const extraNames = await ensureExtras(ff, job.extras);
  const cmd = parseCommand(job.command, inputName, job.meta?.duration ?? null, flavor === "mt" ? MT_THREADS : undefined, extraNames);
  if (!cmd.ok) throw new Error(cmd.errors.join(" • "));
  st.setJobDuration(cmd.expectedDuration);
  const cli = toCli(cmd.args, job.file.name);
  st.setCommand(cli);
  cmd.notes.forEach((n) => st.pushLog(`[warn] ${n}`));
  st.pushLog(`$ ${cli}`);
  const out = await execAndRead(ff, cmd.args, cmd.outName);
  return out && { ...out, mime: cmd.mime, ext: cmd.ext, name: cmd.displayName };
}

function resetProgress() {
  useStore.setState({ progress: 0, eta: null, liveSize: 0, jobDuration: null, startedAt: Date.now(), status: "processing" });
}

/** Run a job with the automatic fallbacks (MT crash → ST, VP9 → VP8). */
async function runJob(job: Job): Promise<EncodeResult | null> {
  const retry = <T,>(log: string, fn: () => Promise<T>) => {
    useStore.getState().pushLog(log);
    dispose();
    resetProgress();
    return fn();
  };

  if (job.mode === "command") {
    const probe = parseCommand(job.command, "input", null, undefined, job.extras.map((f) => f.name));
    const flavor: Flavor = probe.needsSingleThread || !mtAvailable() ? "st" : "mt";
    try {
      return await encodeCustom(job, flavor);
    } catch (e) {
      if (cancelled || !(e instanceof CoreCrash) || flavor !== "mt") throw e;
      mtBroken = true;
      return retry("[engine] multi-thread core crashed — switching to single-thread and retrying", () => encodeCustom(job, "st"));
    }
  }

  const flavor = flavorFor(job.settings);
  const isVp9 = resolveCompat(job.settings).settings.vcodec === "libvpx-vp9";
  try {
    return await encodePreset(job, job.settings, flavor);
  } catch (e) {
    if (cancelled) throw e;
    if (isVp9) {
      // libvpx-vp9 crashes inside current ffmpeg.wasm builds → fall back to VP8 (still WebM)
      return retry("[warn] VP9 failed in ffmpeg.wasm — switching to VP8 (WebM)", () => encodePreset(job, { ...job.settings, vcodec: "libvpx" }, "st"));
    }
    if (e instanceof CoreCrash && flavor === "mt") {
      mtBroken = true;
      return retry("[engine] multi-thread core crashed — switching to single-thread and retrying", () => encodePreset(job, job.settings, "st"));
    }
    throw e;
  }
}

function toBlob(out: EncodeResult) {
  return new Blob([out.data.slice().buffer as ArrayBuffer], { type: out.mime });
}

function errorText(e: unknown): string {
  const msg = (e as Error)?.message ?? String(e);
  return /memory|OOM|out of bounds/i.test(msg) ? tr("err.oom") : msg;
}

function fail(e: unknown) {
  if (cancelled) return;
  if (e instanceof CoreCrash) dispose();
  useStore.getState().setError(errorText(e));
  useStore.getState().setStatus("error");
}

function currentJob(file: File, meta: MediaMeta | null, trim: Trim | null): Job {
  const st = useStore.getState();
  return { file, meta, mode: st.mode, settings: st.settings, command: st.customCommand, trim, extras: st.extraFiles };
}

/* ------------------------------------------------------------------ *
 * React hook
 * ------------------------------------------------------------------ */
export function useFFmpeg() {
  const preload = useCallback(async () => {
    try {
      await loadEngine(flavorFor(useStore.getState().settings));
    } catch (e) {
      useStore.getState().setError(tr("err.engine", { msg: (e as Error)?.message ?? String(e) }));
      useStore.getState().setStatus("error");
    }
  }, []);

  const selectFile = useCallback(async (file: File) => {
    const st = useStore.getState();
    const ext = extOf(file.name);
    if (!ACCEPTED_EXT.includes(ext)) {
      st.setError(tr("up.unsupported", { ext: ext || "?", list: ACCEPTED_EXT.map((x) => "." + x).join(", ") }));
      return;
    }
    st.resetAll();
    st.setError(null);
    st.setFile(file);
    st.setStatus("probing");

    const quick = await probeWithVideoElement(file);
    st.setMeta({
      name: file.name, size: file.size, type: file.type, duration: quick?.duration && Number.isFinite(quick.duration) ? quick.duration : 0,
      width: quick?.width ?? 0, height: quick?.height ?? 0, bitrate: null, fps: null, vcodec: null, acodec: null,
    });
    try {
      useStore.getState().setStatus("probing");
      const meta = await probeMeta(file);
      if (useStore.getState().file !== file) return; // user picked another file meanwhile
      useStore.getState().setMeta(meta);
      useStore.getState().pushLog(`[probe] ${file.name}: ${meta.width}x${meta.height}, ${meta.vcodec ?? "?"} / ${meta.acodec ?? "no audio"}, ${meta.duration.toFixed(2)}s`);
      useStore.getState().setStatus("ready");
    } catch (e) {
      probeSink = null;
      useStore.getState().setError(tr("err.read", { msg: (e as Error)?.message ?? String(e) }));
      useStore.getState().setStatus("error");
    }
  }, []);

  /** One file → single mode; several (or a queue already exists) → batch queue. */
  const selectFiles = useCallback(async (files: File[]) => {
    const st = useStore.getState();
    const ok = files.filter((f) => ACCEPTED_EXT.includes(extOf(f.name)));
    const bad = files.filter((f) => !ACCEPTED_EXT.includes(extOf(f.name)));
    if (bad.length) st.setError(tr("up.unsupported", { ext: extOf(bad[0].name) || "?", list: ACCEPTED_EXT.map((x) => "." + x).join(", ") }));
    if (!ok.length) return;
    if (ok.length === 1 && st.queue.length === 0) return selectFile(ok[0]);
    if (st.queueRunning && ok.length) return st.addToQueue(ok);
    const carry = st.file && st.queue.length === 0 ? [st.file] : [];
    if (carry.length) st.resetAll();
    st.addToQueue([...carry, ...ok]);
    if (!useStore.getState().engine.loaded) loadEngine(flavorFor(st.settings)).catch(() => {});
    if (useStore.getState().status === "loading-engine") return;
    useStore.getState().setStatus("ready");
  }, [selectFile]);

  const run = useCallback(async () => {
    const st = useStore.getState();
    const file = st.file;
    if (!file) return;
    cancelled = false;
    st.startJob();
    try {
      const out = await runJob(currentJob(file, st.meta, st.mode === "preset" ? st.trim : null));
      if (!out || cancelled) return;
      const blob = toBlob(out);
      const s2 = useStore.getState();
      s2.setResult({
        url: URL.createObjectURL(blob),
        name: out.name ?? `${baseName(file.name)}_compressed.${out.ext}`,
        size: blob.size,
        mime: out.mime,
        elapsed: out.elapsed,
      });
      s2.setProgress({ progress: 1, eta: 0, liveSize: blob.size });
      s2.setStatus("done");
      recordJob(file.size - blob.size);
    } catch (e) {
      fail(e);
    }
  }, []);

  /** Encode ~5 s from the middle of the (trimmed) range → quality preview + size estimate. */
  const runSample = useCallback(async () => {
    const st = useStore.getState();
    const file = st.file;
    const dur = st.meta?.duration ?? 0;
    if (!file || !dur || st.mode !== "preset") return;
    const range = st.trim ?? { start: 0, end: dur };
    const rangeLen = Math.max(0.1, range.end - range.start);
    const len = Math.min(5, rangeLen);
    const start = range.start + Math.max(0, (rangeLen - len) / 2);
    cancelled = false;
    st.setSample(null);
    useStore.setState({ sampling: true, error: null });
    resetProgress();
    try {
      const out = await runJob({ ...currentJob(file, st.meta, { start, end: start + len }), rateDuration: rangeLen });
      if (!out || cancelled) return;
      const blob = toBlob(out);
      useStore.getState().setSample({
        url: URL.createObjectURL(blob), size: blob.size, seconds: len, estimate: Math.round(blob.size * (rangeLen / len)), mime: out.mime,
      });
      useStore.setState({ status: "ready", progress: 0 });
    } catch (e) {
      fail(e);
    } finally {
      useStore.setState({ sampling: false });
    }
  }, []);

  /** Process every waiting item in the queue, one after another. */
  const runQueue = useCallback(async () => {
    const st = useStore.getState();
    if (st.queueRunning) return;
    cancelled = false;
    useStore.setState({ queueRunning: true, error: null });
    st.setResult(null);
    for (;;) {
      const s = useStore.getState();
      if (!s.queueRunning) break;
      const item = s.queue.find((q) => q.status === "waiting");
      if (!item) break;
      s.updateQueueItem(item.id, { status: "running", error: undefined });
      resetProgress();
      try {
        const meta = await probeMeta(item.file);
        if (cancelled) { useStore.getState().updateQueueItem(item.id, { status: "waiting" }); break; }
        useStore.getState().pushLog(`[queue] ${item.file.name} (${meta.duration.toFixed(1)}s)`);
        const out = await runJob(currentJob(item.file, meta, null));
        if (!out || cancelled) { useStore.getState().updateQueueItem(item.id, { status: "waiting" }); break; }
        const blob = toBlob(out);
        useStore.getState().updateQueueItem(item.id, {
          status: "done",
          progress: 1,
          result: {
            url: URL.createObjectURL(blob),
            name: out.name ? `${baseName(item.file.name)}_${out.name}` : `${baseName(item.file.name)}_compressed.${out.ext}`,
            size: blob.size, mime: out.mime, elapsed: out.elapsed,
          },
        });
        recordJob(item.file.size - blob.size);
      } catch (e) {
        if (cancelled) { useStore.getState().updateQueueItem(item.id, { status: "waiting" }); break; }
        if (e instanceof CoreCrash) dispose();
        useStore.getState().updateQueueItem(item.id, { status: "error", error: errorText(e) });
      }
    }
    useStore.setState({ queueRunning: false, status: "ready", progress: 0 });
  }, []);

  const cancel = useCallback(() => {
    cancelled = true;
    crashReject = null;
    dispose();
    const st = useStore.getState();
    st.pushLog("[engine] cancelled (worker terminated) — the engine reloads on the next job");
    useStore.setState({ queueRunning: false, sampling: false });
    useStore.setState({ queue: useStore.getState().queue.map((q) => (q.status === "running" ? { ...q, status: "waiting" } : q)) });
    st.setProgress({ progress: 0, eta: null, liveSize: 0 });
    st.setStatus(st.file || st.queue.length ? "ready" : "idle");
  }, []);

  const reset = useCallback(async () => {
    if (ffmpeg && writtenInput) await ffmpeg.deleteFile(writtenInput.name).catch(() => {});
    writtenInput = null;
    useStore.getState().resetAll();
  }, []);

  return { preload, selectFile, selectFiles, run, runSample, runQueue, cancel, reset };
}
