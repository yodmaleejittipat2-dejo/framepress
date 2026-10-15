"use client";
import { Clock, Film, Gauge, HardDrive, Maximize, Music, RefreshCcw, Timer } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatBytes, formatDuration } from "@/lib/format";

export default function FileInfoCard({ onChange }: { onChange: () => void }) {
  const meta = useStore((s) => s.meta);
  const url = useStore((s) => s.sourceUrl);
  const status = useStore((s) => s.status);
  if (!meta) return null;

  const probing = status === "probing" || (status === "loading-engine" && !meta.vcodec);
  const items = [
    { icon: HardDrive, label: "Size", value: formatBytes(meta.size) },
    { icon: Maximize, label: "Resolution", value: meta.width ? `${meta.width}×${meta.height}` : "—" },
    { icon: Clock, label: "Duration", value: meta.duration ? formatDuration(meta.duration) : "—" },
    { icon: Gauge, label: "Bitrate", value: meta.bitrate ? `${meta.bitrate.toLocaleString()} kb/s` : "—" },
    { icon: Timer, label: "Frame rate", value: meta.fps ? `${+meta.fps.toFixed(2)} fps` : "—" },
    { icon: Film, label: "Video codec", value: meta.vcodec ?? "—" },
    { icon: Music, label: "Audio codec", value: meta.acodec ?? (probing ? "—" : "ไม่มีเสียง") },
  ];

  return (
    <div className="panel pop p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="kicker">Source file</div>
          <h3 className="mt-2 truncate text-lg font-semibold" title={meta.name}>{meta.name}</h3>
        </div>
        <button className="btn btn-ghost btn-sm shrink-0" onClick={onChange} disabled={status === "processing"}>
          <RefreshCcw size={14} /> เปลี่ยนไฟล์
        </button>
      </div>
      {url && (
        <video src={url} controls muted playsInline preload="metadata"
          className="mt-4 aspect-video w-full rounded-xl border border-line bg-black object-contain" />
      )}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="cell px-3.5 py-3">
            <div className="flex items-center gap-1.5 mono text-[.6rem] uppercase tracking-[.1em] text-muted"><Icon size={12} /> {label}</div>
            <div className={`mt-1 truncate text-sm font-semibold ${probing && value === "—" ? "animate-pulse text-faint" : ""}`} title={value}>{value}</div>
          </div>
        ))}
        <div className="flex items-center justify-center rounded-[14px] border border-dashed border-line px-3 py-3 mono text-[.62rem] uppercase tracking-[.12em] text-muted">
          {probing ? "กำลังอ่านไฟล์…" : "Local only"}
        </div>
      </div>
    </div>
  );
}
