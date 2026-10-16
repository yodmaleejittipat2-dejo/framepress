"use client";
import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileVideo, Loader2, Package, Play, Plus, Square, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { formatBytes } from "@/lib/format";
import { ACCEPT_ATTR } from "@/lib/presets";
import Corners from "./Corners";

/** Batch mode: several files processed one after another with the same settings. */
export default function QueueCard({ onAdd, onStart, onStop }: { onAdd: (f: File[]) => void; onStart: () => void; onStop: () => void }) {
  const t = useT();
  const queue = useStore((s) => s.queue);
  const running = useStore((s) => s.queueRunning);
  const progress = useStore((s) => s.progress);
  const status = useStore((s) => s.status);
  const remove = useStore((s) => s.removeFromQueue);
  const clear = useStore((s) => s.clearQueue);
  const input = useRef<HTMLInputElement>(null);
  const [zipping, setZipping] = useState(false);

  const done = queue.filter((q) => q.status === "done");
  const waiting = queue.filter((q) => q.status === "waiting").length;
  const saved = done.reduce((a, q) => a + Math.max(0, q.file.size - (q.result?.size ?? q.file.size)), 0);

  const downloadAll = async () => {
    setZipping(true);
    try {
      const { zip } = await import("fflate");
      const files: Record<string, [Uint8Array, { level: 0 }]> = {};
      for (const q of done) {
        const buf = new Uint8Array(await (await fetch(q.result!.url)).arrayBuffer());
        let name = q.result!.name;
        for (let i = 2; files[name]; i++) name = q.result!.name.replace(/(\.\w+)$/, `_${i}$1`);
        files[name] = [buf, { level: 0 }]; // video is already compressed — just store
      }
      const data = await new Promise<Uint8Array>((res, rej) => zip(files, (err, out) => (err ? rej(err) : res(out))));
      const url = URL.createObjectURL(new Blob([data.slice().buffer as ArrayBuffer], { type: "application/zip" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: "framepress.zip" });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="panel corners pop p-5 sm:p-6">
      {running && <Corners />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="kicker">{t("q.title")}</div>
          <h3 className="mt-2 text-lg font-semibold">{t("q.files", { n: queue.length })}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => input.current?.click()}><Plus size={14} /> {t("q.add")}</button>
          {!running && <button className="btn btn-ghost btn-sm" onClick={clear}><Trash2 size={14} /> {t("q.clear")}</button>}
        </div>
        <input ref={input} type="file" multiple accept={ACCEPT_ATTR} hidden onChange={(e) => { const f = Array.from(e.target.files ?? []); if (f.length) onAdd(f); e.target.value = ""; }} />
      </div>

      <ul className="mt-4 max-h-[420px] space-y-2 overflow-auto pr-1">
        {queue.map((q) => (
          <li key={q.id} className={`cell flex items-center gap-3 p-3 ${q.status === "running" ? "!border-accent" : ""}`}>
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${q.status === "done" ? "bg-accent text-accent-ink" : "border border-line"}`}>
              {q.status === "done" ? <CheckCircle2 size={16} /> : q.status === "running" ? <Loader2 size={16} className="animate-spin" /> : q.status === "error" ? <AlertTriangle size={16} className="text-err" /> : <FileVideo size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <b className="block truncate text-sm font-semibold" title={q.file.name}>{q.file.name}</b>
              {q.status === "running" ? (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="bar flex-1"><i style={{ width: `${Math.max(3, Math.round(progress * 100))}%` }} /></div>
                  <span className="mono text-[.7rem] tabular-nums">{status === "processing" ? `${Math.round(progress * 100)}%` : ""}</span>
                </div>
              ) : (
                <span className={`block truncate mono text-[.7rem] ${q.status === "error" ? "text-err" : "text-muted"}`} title={q.error}>
                  {formatBytes(q.file.size)}
                  {q.status === "done" && q.result && <> → <b className="text-accent-text">{formatBytes(q.result.size)}</b> (−{Math.max(0, Math.round((1 - q.result.size / q.file.size) * 100))}%)</>}
                  {q.status === "waiting" && ` · ${t("q.waiting")}`}
                  {q.status === "error" && ` · ${q.error ?? t("q.failed")}`}
                </span>
              )}
            </div>
            {q.status === "done" && q.result && (
              <a className="icon-btn !h-8 !w-8" href={q.result.url} download={q.result.name} title={t("pr.download")} aria-label={t("pr.download")}><Download size={14} /></a>
            )}
            {q.status !== "running" && (
              <button className="icon-btn !h-8 !w-8" onClick={() => remove(q.id)} title={t("q.remove")} aria-label={t("q.remove")}><X size={14} /></button>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-3 mono text-[.72rem] text-muted">{t("q.summary", { done: done.length, total: queue.length, saved: formatBytes(saved) })}</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {running ? (
          <button className="btn btn-ghost btn-lg" onClick={onStop}><Square size={15} /> {t("q.stop")}</button>
        ) : (
          <button className="btn btn-primary btn-lg" onClick={onStart} disabled={!waiting || status === "loading-engine"}><Play size={17} fill="currentColor" /> {t("q.startAll")}</button>
        )}
        <button className="btn btn-inverse btn-lg" onClick={downloadAll} disabled={!done.length || zipping}>
          {zipping ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />} {zipping ? t("q.zipping") : t("q.dlAll")}
        </button>
      </div>
      <p className="mt-3 text-[.72rem] text-muted">{t("q.note")}</p>
    </div>
  );
}
