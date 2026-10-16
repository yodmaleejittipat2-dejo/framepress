"use client";
import { useEffect, useState } from "react";
import { Flag, FlagOff, Maximize2, Scissors } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { formatDuration } from "@/lib/format";

/** mm:ss.s for trim labels */
const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${String(m).padStart(2, "0")}:${r.toFixed(1).padStart(4, "0")}`;
};

/** Dual-handle range slider to export only part of the clip. */
export default function TrimBar({ video }: { video: HTMLVideoElement | null }) {
  const t = useT();
  const duration = useStore((s) => s.meta?.duration ?? 0);
  const trim = useStore((s) => s.trim);
  const setTrim = useStore((s) => s.setTrim);
  const mode = useStore((s) => s.mode);
  const locked = useStore((s) => s.status === "processing");
  const [head, setHead] = useState(0);

  useEffect(() => {
    if (!video) return;
    const on = () => setHead(video.currentTime);
    video.addEventListener("timeupdate", on);
    return () => video.removeEventListener("timeupdate", on);
  }, [video]);

  if (!duration) return null;
  const start = trim?.start ?? 0;
  const end = trim?.end ?? duration;
  const MIN = Math.min(0.5, duration);
  const step = duration > 600 ? 1 : 0.1;

  const update = (s: number, e: number) => {
    s = Math.max(0, Math.min(s, duration - MIN));
    e = Math.min(duration, Math.max(e, s + MIN));
    // whole clip selected → no trim at all
    setTrim(s <= 0.05 && e >= duration - 0.05 ? null : { start: +s.toFixed(2), end: +e.toFixed(2) });
  };
  const seek = (v: number) => { if (video) video.currentTime = v; };
  const pct = (v: number) => `${(v / duration) * 100}%`;

  return (
    <div className={`cell mt-3 p-3.5 ${locked ? "pointer-events-none opacity-50" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 mono text-[.66rem] uppercase tracking-[.1em] text-muted"><Scissors size={12} /> {t("trim.title")}</span>
        <span className="mono text-[.72rem]">
          <span className="text-muted">{t("trim.length")}</span> <b className={trim ? "text-accent-text" : ""}>{formatDuration(end - start)}</b>
        </span>
      </div>

      <div className="relative mt-3 h-8">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded bg-line" />
        <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded bg-accent" style={{ left: pct(start), width: pct(end - start) }} />
        {video && <div className="absolute top-0 h-8 w-0.5 bg-fg/60" style={{ left: pct(Math.min(head, duration)) }} aria-hidden />}
        <input type="range" className="trim-range" min={0} max={duration} step={step} value={start}
          aria-label={t("trim.start")} onChange={(e) => { const v = Number(e.target.value); update(v, end); seek(v); }} />
        <input type="range" className="trim-range" min={0} max={duration} step={step} value={end}
          aria-label={t("trim.end")} onChange={(e) => { const v = Number(e.target.value); update(start, v); seek(v); }} />
      </div>

      <div className="mt-1 flex justify-between mono text-[.7rem]">
        <span><span className="text-muted">{t("trim.start")}</span> {fmt(start)}</span>
        <span><span className="text-muted">{t("trim.end")}</span> {fmt(end)}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {video && <button type="button" className="opt !text-[.72rem]" onClick={() => update(video.currentTime, end)}><Flag size={12} className="mr-1 inline" />{t("trim.setStart")}</button>}
        {video && <button type="button" className="opt !text-[.72rem]" onClick={() => update(start, video.currentTime)}><FlagOff size={12} className="mr-1 inline" />{t("trim.setEnd")}</button>}
        {trim && <button type="button" className="opt !text-[.72rem]" onClick={() => setTrim(null)}><Maximize2 size={12} className="mr-1 inline" />{t("trim.reset")}</button>}
      </div>
      {trim && mode === "command" && <p className="mt-2 text-[.72rem] text-warn">{t("trim.cmdNote")}</p>}
    </div>
  );
}
