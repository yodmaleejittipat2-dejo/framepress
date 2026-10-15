"use client";
import { AlertTriangle, ArrowDown, ArrowUp, Download, Loader2, Play, RotateCcw, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { formatBytes, formatDuration } from "@/lib/format";
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

export default function ProgressCard({ onStart, onCancel, onReset }: { onStart: () => void; onCancel: () => void; onReset: () => void }) {
  const { status, progress, eta, liveSize, startedAt, result, error, meta, sourceUrl, file } = useStore();
  const elapsed = useElapsed(status === "processing", startedAt);

  if (!file) {
    return (
      <div className="panel-soft flex items-center gap-4 p-5 text-sm text-muted">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line"><Play size={16} /></span>
        เลือกไฟล์วิดีโอก่อน แล้วปุ่มเริ่มประมวลผลจะปรากฏที่นี่
      </div>
    );
  }

  const pct = Math.round(progress * 100);
  const busyPrep = status === "loading-engine" || status === "probing";

  return (
    <div className="panel corners pop p-5 sm:p-6" aria-live="polite">
      {status === "processing" && <Corners />}
      <div className="kicker">Process</div>

      {(status === "ready" || busyPrep) && (
        <div className="mt-4">
          {busyPrep && (
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-muted">
                <Loader2 size={14} className="animate-spin" />
                {status === "loading-engine" ? "กำลังโหลด FFmpeg engine (~30MB ครั้งแรก แล้วจะแคชไว้)…" : "กำลังอ่านข้อมูลไฟล์…"}
              </div>
              <div className="bar indeterminate"><i /></div>
            </div>
          )}
          <button className="btn btn-primary btn-lg w-full" onClick={onStart} disabled={busyPrep}>
            <Play size={18} fill="currentColor" /> เริ่มบีบอัด / แปลงไฟล์
          </button>
          <p className="mt-3 text-center text-[.74rem] text-muted">ประมวลผลบนเครื่องคุณ — ความเร็วขึ้นกับ CPU และความยาวคลิป</p>
        </div>
      )}

      {status === "processing" && (
        <div className="mt-4">
          <div className="flex items-end justify-between gap-4">
            <b className="mono text-[clamp(2.6rem,7vw,3.8rem)] font-semibold leading-none tabular-nums">
              {pct}<span className="text-2xl text-muted">%</span>
            </b>
            <div className="text-right mono text-[.76rem] leading-relaxed text-muted tabular-nums">
              <div>ETA <b className="text-fg">{eta != null ? formatDuration(eta) : "--:--"}</b></div>
              <div>ใช้ไป {formatDuration(elapsed)}</div>
            </div>
          </div>
          <div className="bar mt-4"><i style={{ width: `${Math.max(2, pct)}%` }} /></div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="cell p-3">
              <div className="mono text-[.6rem] uppercase tracking-[.1em] text-muted">ต้นฉบับ</div>
              <b className="mt-1 block font-semibold">{formatBytes(meta?.size ?? 0)}</b>
            </div>
            <div className="cell p-3">
              <div className="mono text-[.6rem] uppercase tracking-[.1em] text-muted">เขียนแล้ว · live</div>
              <b className="mt-1 block font-semibold tabular-nums">{formatBytes(liveSize)}</b>
            </div>
          </div>
          <button className="btn btn-ghost mt-4 w-full" onClick={onCancel}><Square size={14} /> ยกเลิก</button>
        </div>
      )}

      {status === "done" && result && meta && <DoneView onReset={onReset} sourceUrl={sourceUrl} />}

      {status === "error" && (
        <div className="mt-4 rounded-xl border border-err/40 bg-err/10 p-4 text-sm">
          <p className="flex gap-2 text-err"><AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error ?? "เกิดข้อผิดพลาด"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn btn-primary btn-sm" onClick={onStart}><RotateCcw size={14} /> ลองใหม่</button>
            <button className="btn btn-ghost btn-sm" onClick={onReset}>เลือกไฟล์ใหม่</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DoneView({ onReset, sourceUrl }: { onReset: () => void; sourceUrl: string | null }) {
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
          <p className="mt-2 text-[.8rem] text-muted">{smaller ? "เล็กลงจากต้นฉบับ" : "ใหญ่ขึ้นจากต้นฉบับ (ลองเพิ่ม CRF หรือลดความละเอียด)"} · ใช้เวลา {formatDuration(result.elapsed)}</p>
        </div>
        <div className="seg">
          <button aria-selected={view === "before"} onClick={() => setView("before")}>Before</button>
          <button aria-selected={view === "after"} onClick={() => setView("after")}>After</button>
        </div>
      </div>

      <video key={view} src={view === "after" ? result.url : sourceUrl ?? undefined} controls playsInline
        className="mt-4 aspect-video w-full rounded-xl border border-line bg-black object-contain" />

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
        <a className="btn btn-primary btn-lg" href={result.url} download={result.name}><Download size={18} /> ดาวน์โหลด {formatBytes(result.size)}</a>
        <button className="btn btn-ghost btn-lg" onClick={onReset}><RotateCcw size={16} /> เริ่มใหม่</button>
      </div>
      <p className="mt-2 truncate text-center mono text-[.68rem] text-muted" title={result.name}>{result.name}</p>
    </div>
  );
}
