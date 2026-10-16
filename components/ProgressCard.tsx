"use client";
import { AlertTriangle, ArrowDown, ArrowUp, Download, FlaskConical, Loader2, Play, RotateCcw, Square, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { extOf, formatBytes, formatDuration } from "@/lib/format";
import { parseCommand } from "@/lib/command";
import { resolveCompat } from "@/lib/buildArgs";
import Corners from "./Corners";

function useElapsed(active: boolean, startedAt: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [active]);
  return startedAt ? Math.max(0, (now - startedAt) / 1000) : 0;
}

function Media({ url, mime, name, className }: { url: string; mime: string; name: string; className?: string }) {
  if (mime.startsWith("audio/")) return <div className={`rounded-xl border border-line bg-surface p-4 ${className}`}><audio src={url} controls className="w-full" /></div>;
  // eslint-disable-next-line @next/next/no-img-element
  if (mime.startsWith("image/")) return <img src={url} alt={name} className={`max-h-[420px] w-full rounded-xl border border-line bg-black object-contain ${className}`} />;
  return <video src={url} controls playsInline className={`aspect-video w-full rounded-xl border border-line bg-black object-contain ${className}`} />;
}

/** Size estimate + "test 5 seconds" (preset mode only). */
function Estimate({ onSample }: { onSample: () => void }) {
  const t = useT();
  const settings = useStore((s) => s.settings);
  const meta = useStore((s) => s.meta);
  const trim = useStore((s) => s.trim);
  const sample = useStore((s) => s.sample);
  const setSample = useStore((s) => s.setSample);
  const { settings: eff } = resolveCompat(settings);
  const len = trim ? trim.end - trim.start : meta?.duration ?? 0;

  let line: string;
  if (sample) line = t("est.fromSample", { size: formatBytes(sample.estimate), sec: +sample.seconds.toFixed(1) });
  else if (eff.rateMode === "target") {
    const audio = eff.acodec === "none" ? 0 : parseInt(eff.abitrate, 10) * 1000 / 8 * len;
    line = t("est.target", { size: formatBytes(Math.min(eff.targetSizeMB * 1024 * 1024, (meta?.size ?? Infinity) + audio)) });
  } else line = t("est.unknown");

  return (
    <div className="cell mb-4 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="mono text-[.62rem] uppercase tracking-[.1em] text-muted">{t("est.title")}</div>
          <p className={`mt-1 text-[.84rem] ${sample || eff.rateMode === "target" ? "font-semibold" : "text-muted"}`}>{line}</p>
        </div>
        {meta?.duration ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onSample}><FlaskConical size={14} /> {t("est.test")}</button>
        ) : null}
      </div>
      {sample && (
        <div className="pop mt-3">
          <div className="mb-2 flex items-center justify-between mono text-[.68rem] text-muted">
            <span>{t("est.sampleOf", { sec: +sample.seconds.toFixed(1), size: formatBytes(sample.size) })}</span>
            <button type="button" className="inline-flex items-center gap-1 hover:text-fg" onClick={() => setSample(null)}><X size={12} /> {t("est.close")}</button>
          </div>
          <Media url={sample.url} mime={sample.mime} name="sample" />
        </div>
      )}
    </div>
  );
}

export default function ProgressCard({ onStart, onSample, onCancel, onReset }: { onStart: () => void; onSample: () => void; onCancel: () => void; onReset: () => void }) {
  const t = useT();
  const { status, progress, eta, liveSize, startedAt, result, error, meta, sourceUrl, file, sampling, mode, customCommand, extraFiles } = useStore();
  const elapsed = useElapsed(status === "processing", startedAt);

  if (!file) {
    return (
      <div className="panel-soft flex items-center gap-4 p-5 text-sm text-muted">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line"><Play size={16} /></span>
        {t("pr.pickFirst")}
      </div>
    );
  }

  const pct = Math.round(progress * 100);
  const busyPrep = status === "loading-engine" || status === "probing";
  const cmdOk = mode !== "command" || parseCommand(customCommand, `input.${extOf(file.name) || "mp4"}`, null, undefined, extraFiles.map((f) => f.name)).ok;

  return (
    <div className="panel corners pop p-5 sm:p-6" aria-live="polite">
      {status === "processing" && <Corners />}
      <div className="kicker">{t("pr.title")}</div>

      {(status === "ready" || busyPrep) && (
        <div className="mt-4">
          {busyPrep && (
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-muted">
                <Loader2 size={14} className="animate-spin" />
                {status === "loading-engine" ? t("pr.loadingEngine") : t("pr.probing")}
              </div>
              <div className="bar indeterminate"><i /></div>
            </div>
          )}
          {mode === "preset" && !busyPrep && <Estimate onSample={onSample} />}
          <button className="btn btn-primary btn-lg w-full" onClick={onStart} disabled={busyPrep || !cmdOk}>
            <Play size={18} fill="currentColor" /> {mode === "command" ? t("pr.runCmd") : t("pr.start")}
          </button>
          {!cmdOk && <p className="mt-2 text-center text-[.74rem] text-err">{t("pr.cmdInvalid")}</p>}
          <p className="mt-3 text-center text-[.74rem] text-muted">{t("pr.localNote")}</p>
        </div>
      )}

      {status === "processing" && (
        <div className="mt-4">
          {sampling && <p className="mb-2 flex items-center gap-2 text-sm text-muted"><FlaskConical size={14} /> {t("est.testing")}</p>}
          <div className="flex items-end justify-between gap-4">
            <b className="mono text-[clamp(2.6rem,7vw,3.8rem)] font-semibold leading-none tabular-nums">
              {pct}<span className="text-2xl text-muted">%</span>
            </b>
            <div className="text-right mono text-[.76rem] leading-relaxed text-muted tabular-nums">
              <div>{t("pr.eta")} <b className="text-fg">{eta != null ? formatDuration(eta) : "--:--"}</b></div>
              <div>{t("pr.elapsed")} {formatDuration(elapsed)}</div>
            </div>
          </div>
          <div className="bar mt-4"><i style={{ width: `${Math.max(2, pct)}%` }} /></div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="cell p-3">
              <div className="mono text-[.6rem] uppercase tracking-[.1em] text-muted">{t("pr.original")}</div>
              <b className="mt-1 block font-semibold">{formatBytes(meta?.size ?? 0)}</b>
            </div>
            <div className="cell p-3">
              <div className="mono text-[.6rem] uppercase tracking-[.1em] text-muted">{t("pr.written")}</div>
              <b className="mt-1 block font-semibold tabular-nums">{formatBytes(liveSize)}</b>
            </div>
          </div>
          <button className="btn btn-ghost mt-4 w-full" onClick={onCancel}><Square size={14} /> {t("pr.cancel")}</button>
        </div>
      )}

      {status === "done" && result && meta && <DoneView onReset={onReset} sourceUrl={sourceUrl} />}

      {status === "error" && (
        <div className="mt-4 rounded-xl border border-err/40 bg-err/10 p-4 text-sm">
          <p className="flex gap-2 break-words text-err"><AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error ?? t("pr.error")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn btn-primary btn-sm" onClick={onStart}><RotateCcw size={14} /> {t("pr.retry")}</button>
            <button className="btn btn-ghost btn-sm" onClick={onReset}>{t("pr.newFile")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DoneView({ onReset, sourceUrl }: { onReset: () => void; sourceUrl: string | null }) {
  const t = useT();
  const result = useStore((s) => s.result)!;
  const meta = useStore((s) => s.meta)!;
  const [view, setView] = useState<"after" | "before">("after");
  const saved = 1 - result.size / meta.size;
  const smaller = saved >= 0;
  const ratio = Math.max(0.02, Math.min(1, result.size / meta.size));

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <b className="flex items-center gap-2 mono text-[clamp(2.2rem,6vw,3.2rem)] font-semibold leading-none">
            {smaller ? <ArrowDown size={30} className="text-accent-text" /> : <ArrowUp size={30} className="text-warn" />}
            {Math.abs(saved * 100).toFixed(1)}%
          </b>
          <p className="mt-2 text-[.8rem] text-muted">{smaller ? t("pr.smaller") : t("pr.bigger")} · {t("pr.took")} {formatDuration(result.elapsed)}</p>
        </div>
        {result.mime.startsWith("video/") && (
          <div className="seg">
            <button aria-selected={view === "before"} onClick={() => setView("before")}>Before</button>
            <button aria-selected={view === "after"} onClick={() => setView("after")}>After</button>
          </div>
        )}
      </div>

      <div className="mt-4" key={view}>
        <Media url={view === "after" ? result.url : sourceUrl ?? result.url} mime={view === "after" ? result.mime : "video/mp4"} name={result.name} />
      </div>

      <div className="mt-4 space-y-3 text-[.78rem]">
        <div>
          <div className="mb-1.5 flex justify-between mono text-muted"><span>BEFORE · {meta.name.split(".").pop()?.toUpperCase()}</span><b className="text-fg">{formatBytes(meta.size)}</b></div>
          <div className="bar dim"><i style={{ width: smaller ? "100%" : `${(meta.size / result.size) * 100}%` }} /></div>
        </div>
        <div>
          <div className="mb-1.5 flex justify-between mono text-muted"><span>AFTER · {result.name.split(".").pop()?.toUpperCase()}</span><b className="text-accent-text">{formatBytes(result.size)}</b></div>
          <div className="bar static"><i style={{ width: smaller ? `${ratio * 100}%` : "100%" }} /></div>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
        <a className="btn btn-primary btn-lg" href={result.url} download={result.name}><Download size={18} /> {t("pr.download")} {formatBytes(result.size)}</a>
        <button className="btn btn-ghost btn-lg" onClick={onReset}><RotateCcw size={16} /> {t("pr.again")}</button>
      </div>
      <p className="mt-2 truncate text-center mono text-[.68rem] text-muted" title={result.name}>{result.name}</p>
    </div>
  );
}
