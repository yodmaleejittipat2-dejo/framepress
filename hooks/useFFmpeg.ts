"use client";

import { useCallback } from "react";
import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { useStore } from "@/lib/store";
import { buildArgs, resolveCompat, toCli } from "@/lib/buildArgs";
import { parseProbeLog, probeWithVideoElement } from "@/lib/probe";
import { baseName, extOf, parseTimestamp } from "@/lib/format";
import { ACCEPTED_EXT } from "@/lib/presets";
import { parseCommand } from "@/lib/command";
import type { Settings } from "@/lib/types";

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

/** exec() that rejects (instead of hanging) if the core worker crashes. */
function guardedExec(ff: FFmpeg, args: string[]): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    crashReject = reject;
    ff.exec(args).then(resolve, reject);
  }).finally(() => {
    crashReject = null;
  });
}

async function encode(file: File, settings: Settings, flavor: Flavor) {
  const st = useStore.getState();
  const ff = await loadEngine(flavor);
  const inputName = await ensureInput(ff, file);
  const cmd = buildArgs(inputName, baseName(file.name), settings, st.meta, flavor === "mt" ? MT_THREADS : undefined);
  const cli = toCli(cmd.args, file.name);
  st.setCommand(cli);
  cmd.warnings.forEach((w) => st.pushLog(`[warn] ${w}`));
  st.pushLog(`$ ${cli}`);

  const t0 = performance.now();
  const code = await guardedExec(ff, cmd.args);
  if (cancelled) return null;
  if (code !== 0) throw new Error(exitError(code));

  const data = (await ff.readFile(cmd.outName)) as Uint8Array;
  await ff.deleteFile(cmd.outName).catch(() => {});
  return { data, cmd, name: null as string | null, elapsed: (performance.now() - t0) / 1000 };
}

/** Pull the most useful FFmpeg error line out of the log. */
function exitError(code: number): string {
  const logs = useStore.getState().logs;
  const start = logs.map((l) => l.startsWith("$ ")).lastIndexOf(true);
  const recent = logs.slice(start + 1);
  const generic = /conversion failed|error while (opening|filtering)|exiting normally/i;
  // The first specific error after the command is usually the real cause (e.g. "Error setting option crf to value abc.")
  const hit = recent.find((l) => /error|invalid|unrecognized|no such|not found|unknown|cannot|could not|does not|unable|failed|incorrect|undefined constant/i.test(l) && !generic.test(l))
    ?? recent.reverse().find((l) => /error|failed/i.test(l));
  return hit ? `FFmpeg หยุดทำงาน (code ${code}): ${hit.trim()}` : `FFmpeg exited with code ${code} — ดูรายละเอียดใน Log Console`;
}

/** Run a user-pasted ffmpeg command on the uploaded file. */
async function encodeCustom(file: File, text: string, flavor: Flavor) {
  const st = useStore.getState();
  const ff = await loadEngine(flavor);
  const inputName = await ensureInput(ff, file);
  const cmd = parseCommand(text, inputName, st.meta?.duration ?? null, flavor === "mt" ? MT_THREADS : undefined);
  if (!cmd.ok) throw new Error(cmd.errors.join(" • "));
  st.setJobDuration(cmd.expectedDuration);
  const cli = toCli(cmd.args, file.name);
  st.setCommand(cli);
  cmd.notes.forEach((n) => st.pushLog(`[warn] ${n}`));
  st.pushLog(`$ ${cli}`);

  const t0 = performance.now();
  const code = await guardedExec(ff, cmd.args);
  if (cancelled) return null;
  if (code !== 0) throw new Error(exitError(code));

  let data: Uint8Array;
  try {
    data = (await ff.readFile(cmd.outName)) as Uint8Array;
  } catch {
    throw new Error("คำสั่งทำงานจบแต่ไม่มีไฟล์ output — ตรวจสอบคำสั่งอีกครั้ง");
  }
  await ff.deleteFile(cmd.outName).catch(() => {});
  return { data, cmd: { mime: cmd.mime, ext: cmd.ext }, name: cmd.displayName, elapsed: (performance.now() - t0) / 1000 };
}

type EncodeResult = { data: Uint8Array; cmd: { mime: string; ext: string }; name: string | null; elapsed: number };

function finish(file: File, out: EncodeResult) {
  const blob = new Blob([out.data.slice().buffer as ArrayBuffer], { type: out.cmd.mime });
  const s2 = useStore.getState();
  s2.setResult({
    url: URL.createObjectURL(blob),
    name: out.name ?? `${baseName(file.name)}_compressed.${out.cmd.ext}`,
    size: blob.size,
    mime: out.cmd.mime,
    elapsed: out.elapsed,
  });
  s2.setProgress({ progress: 1, eta: 0, liveSize: blob.size });
  s2.setStatus("done");
}

function fail(e: unknown) {
  if (cancelled) return;
  if (e instanceof CoreCrash) dispose();
  const msg = (e as Error)?.message ?? String(e);
  const oom = /memory|OOM|out of bounds/i.test(msg);
  useStore.getState().setError(oom ? "หน่วยความจำของเบราว์เซอร์ไม่พอ (WASM จำกัด ~2GB) — ลองไฟล์ที่เล็กลง หรือลดความละเอียด" : msg);
  useStore.getState().setStatus("error");
}

/* ------------------------------------------------------------------ *
 * React hook
 * ------------------------------------------------------------------ */
export function useFFmpeg() {
  const preload = useCallback(async () => {
    try {
      await loadEngine(flavorFor(useStore.getState().settings));
    } catch (e) {
      useStore.getState().setError(`โหลด FFmpeg ไม่สำเร็จ: ${(e as Error)?.message ?? e}`);
      useStore.getState().setStatus("error");
    }
  }, []);

  const selectFile = useCallback(async (file: File) => {
    const st = useStore.getState();
    const ext = extOf(file.name);
    if (!ACCEPTED_EXT.includes(ext)) {
      st.setError(`ไม่รองรับไฟล์ .${ext || "?"} — รองรับ ${ACCEPTED_EXT.map((x) => "." + x).join(", ")}`);
      return;
    }
    st.resetAll();
    st.setError(null);
    st.setFile(file);
    st.setStatus("probing");

    // 1) Instant metadata from the browser (may fail for .mkv/.avi)
    const quick = await probeWithVideoElement(file);
    st.setMeta({
      name: file.name, size: file.size, type: file.type, duration: quick?.duration ?? 0,
      width: quick?.width ?? 0, height: quick?.height ?? 0, bitrate: null, fps: null, vcodec: null, acodec: null,
    });

    // 2) Accurate metadata from FFmpeg (`ffmpeg -i input`)
    try {
      const ff = await loadEngine(ffFlavor ?? flavorFor(st.settings));
      useStore.getState().setStatus("probing");
      const name = await ensureInput(ff, file);
      probeSink = [];
      await ff.exec(["-hide_banner", "-i", name]).catch(() => 1); // exits 1 (no output file) — expected
      const lines = probeSink;
      probeSink = null;
      const meta = parseProbeLog(lines, { name: file.name, size: file.size, type: file.type });
      if (!meta.duration && quick?.duration) meta.duration = quick.duration;
      if (!meta.width && quick) { meta.width = quick.width; meta.height = quick.height; }
      useStore.getState().setMeta(meta);
      useStore.getState().pushLog(`[probe] ${file.name}: ${meta.width}x${meta.height}, ${meta.vcodec ?? "?"} / ${meta.acodec ?? "no audio"}, ${meta.duration.toFixed(2)}s`);
      useStore.getState().setStatus("ready");
    } catch (e) {
      probeSink = null;
      useStore.getState().setError(`อ่านไฟล์ไม่สำเร็จ: ${(e as Error)?.message ?? e}`);
      useStore.getState().setStatus("error");
    }
  }, []);

  const run = useCallback(async () => {
    const st = useStore.getState();
    const file = st.file;
    if (!file) return;
    cancelled = false;
    st.startJob();

    if (st.mode === "command") {
      const text = st.customCommand;
      const probe = parseCommand(text, "input", null);
      const flavor: Flavor = probe.needsSingleThread || !mtAvailable() ? "st" : "mt";
      try {
        let out;
        try {
          out = await encodeCustom(file, text, flavor);
        } catch (e) {
          if (cancelled || !(e instanceof CoreCrash) || flavor !== "mt") throw e;
          mtBroken = true;
          useStore.getState().pushLog("[engine] multi-thread core crashed — สลับไปใช้ single-thread แล้วเริ่มใหม่อัตโนมัติ");
          dispose();
          useStore.getState().startJob();
          out = await encodeCustom(file, text, "st");
        }
        if (!out || cancelled) return;
        finish(file, out);
      } catch (e) {
        fail(e);
      }
      return;
    }

    const settings = st.settings;
    const flavor = flavorFor(settings);
    const isVp9 = resolveCompat(settings).settings.vcodec === "libvpx-vp9";

    /** Retry once with a fallback plan, on a fresh engine. */
    const retry = (log: string, s: Settings, f: Flavor) => {
      useStore.getState().pushLog(log);
      dispose();
      useStore.getState().startJob();
      return encode(file, s, f);
    };

    try {
      let out;
      try {
        out = await encode(file, settings, flavor);
      } catch (e) {
        if (cancelled) throw e;
        if (isVp9) {
          // libvpx-vp9 crashes inside current ffmpeg.wasm builds → fall back to VP8 (still WebM)
          out = await retry("[warn] VP9 encoder ล้มเหลวใน ffmpeg.wasm — สลับไปใช้ VP8 (WebM) อัตโนมัติ", { ...settings, vcodec: "libvpx" }, "st");
        } else if (e instanceof CoreCrash && flavor === "mt") {
          // MT core crashed → stay on single-thread for this session
          mtBroken = true;
          out = await retry("[engine] multi-thread core crashed — สลับไปใช้ single-thread แล้วเริ่มใหม่อัตโนมัติ", settings, "st");
        } else {
          throw e;
        }
      }
      if (!out || cancelled) return;
      finish(file, out);
    } catch (e) {
      fail(e);
    }
  }, []);

  const cancel = useCallback(() => {
    cancelled = true;
    crashReject = null;
    dispose();
    const st = useStore.getState();
    st.pushLog("[engine] ยกเลิกงานแล้ว (worker terminated) — จะโหลด engine ใหม่เมื่อเริ่มงานถัดไป");
    st.setProgress({ progress: 0, eta: null, liveSize: 0 });
    st.setStatus("ready");
  }, []);

  const reset = useCallback(async () => {
    if (ffmpeg && writtenInput) await ffmpeg.deleteFile(writtenInput.name).catch(() => {});
    writtenInput = null;
    useStore.getState().resetAll();
  }, []);

  return { preload, selectFile, run, cancel, reset };
}
