"use client";
import { useState } from "react";
import { ChevronDown, Copy, Plus, Wand2 } from "lucide-react";
import { newPresetId, PRESET_ICONS, type PresetDoc } from "@/lib/content";
import { DEFAULT_SETTINGS } from "@/lib/presets";
import type { Settings } from "@/lib/types";
import PresetIcon from "../PresetIcon";
import { Label, RowActions, Select, Switch, TextField } from "./fields";

const CODEC_L: Record<string, string> = { libx264: "H.264", libx265: "H.265", "libvpx-vp9": "VP9", libvpx: "VP8" };
const AUDIO_L: Record<string, string> = { aac: "AAC", libmp3lame: "MP3", libopus: "Opus", none: "Mute" };

/** Build a subtitle like "H.264 • 1080p • 30 FPS • AAC 128k" from the settings. */
function describe(s: Settings): string {
  const parts = [CODEC_L[s.vcodec] ?? s.vcodec];
  if (s.resolution === "custom") parts.push(`${s.customW || "auto"}×${s.customH || "auto"}`);
  else if (s.resolution !== "source") parts.push(`${s.resolution}p`);
  parts.push(s.rateMode === "target" ? `≤ ${s.targetSizeMB} MB` : `CRF ${s.crf}`);
  if (s.fps !== "source") parts.push(`${s.fps} FPS`);
  parts.push(s.acodec === "none" ? "ไม่มีเสียง" : `${AUDIO_L[s.acodec]} ${s.abitrate}`);
  return parts.join(" • ");
}

function PresetRow({ p, i, n, groups, onChange, onMove, onDelete, onDuplicate, defaultOpen }: {
  p: PresetDoc; i: number; n: number; groups: string[]; defaultOpen: boolean;
  onChange: (p: PresetDoc) => void; onMove: (d: number) => void; onDelete: () => void; onDuplicate: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const s: Settings = { ...DEFAULT_SETTINGS, ...p.settings, presetId: p.id };
  const setS = (patch: Partial<Settings>) => onChange({ ...p, settings: { ...p.settings, ...patch } });

  return (
    <div className={`panel-soft overflow-hidden ${p.enabled ? "" : "opacity-60"}`}>
      <div className="flex items-center gap-3 p-3.5">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${p.enabled ? "bg-accent text-accent-ink" : "border border-line"}`}><PresetIcon name={p.icon} /></span>
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpen((o) => !o)}>
          <b className="block truncate text-sm font-semibold">{p.title || "(ไม่มีชื่อ)"}</b>
          <span className="block truncate text-[.74rem] text-muted">{p.group} · {p.subtitle}</span>
        </button>
        <Switch checked={p.enabled} onChange={(v) => onChange({ ...p, enabled: v })} />
        <button type="button" className="icon-btn !h-8 !w-8" onClick={() => setOpen((o) => !o)} aria-label="แก้ไข"><ChevronDown size={15} className={open ? "rotate-180" : ""} /></button>
      </div>

      {open && (
        <div className="space-y-4 border-t border-line p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="ชื่อพรีเซ็ต" value={p.title} onChange={(v) => onChange({ ...p, title: v })} />
            <label className="block">
              <Label hint="พิมพ์ใหม่ได้">กลุ่ม</Label>
              <input className="input" list="preset-groups" value={p.group} onChange={(e) => onChange({ ...p, group: e.target.value })} />
              <datalist id="preset-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
            </label>
          </div>
          <div>
            <Label>คำอธิบายใต้ชื่อ</Label>
            <div className="flex gap-2">
              <input className="input" value={p.subtitle} onChange={(e) => onChange({ ...p, subtitle: e.target.value })} />
              <button type="button" className="btn btn-ghost btn-sm" title="สร้างจากค่าที่ตั้งไว้" onClick={() => onChange({ ...p, subtitle: describe(s) })}><Wand2 size={14} /> อัตโนมัติ</button>
            </div>
          </div>
          <div>
            <Label>ไอคอน</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_ICONS.map((ic) => (
                <button key={ic} type="button" onClick={() => onChange({ ...p, icon: ic })} aria-label={ic}
                  className={`grid h-9 w-9 place-items-center rounded-lg border ${p.icon === ic ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface"}`}>
                  <PresetIcon name={ic} size={16} />
                </button>
              ))}
            </div>
          </div>

          <div className="cell grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select label="Video codec" value={s.vcodec} onChange={(v) => setS({ vcodec: v })} options={[
              { v: "libx264", l: "H.264 (libx264)" }, { v: "libx265", l: "H.265 / HEVC" }, { v: "libvpx-vp9", l: "VP9" },
            ]} />
            <Select label="Speed" value={s.speed} onChange={(v) => setS({ speed: v })} options={[
              { v: "ultrafast", l: "Ultrafast" }, { v: "veryfast", l: "Veryfast" }, { v: "medium", l: "Medium" }, { v: "slow", l: "Slow" },
            ]} />
            <Select label="Container" value={s.container} onChange={(v) => setS({ container: v })} options={[
              { v: "mp4", l: "MP4" }, { v: "mov", l: "MOV" }, { v: "mkv", l: "MKV" }, { v: "webm", l: "WEBM" },
            ]} />
            <Select label="Rate control" value={s.rateMode} onChange={(v) => setS({ rateMode: v })} options={[
              { v: "crf", l: "Quality (CRF)" }, { v: "target", l: "Target size" },
            ]} />
            {s.rateMode === "crf" ? (
              <label className="block">
                <Label hint="18–32">CRF</Label>
                <input type="number" min={18} max={32} className="input" value={s.crf} onChange={(e) => setS({ crf: Math.min(32, Math.max(18, Number(e.target.value) || 23)) })} />
              </label>
            ) : (
              <label className="block">
                <Label>Target size (MB)</Label>
                <input type="number" min={1} className="input" value={s.targetSizeMB} onChange={(e) => setS({ targetSizeMB: Math.max(1, Number(e.target.value) || 8) })} />
              </label>
            )}
            <Select label="FPS" value={s.fps} onChange={(v) => setS({ fps: v })} options={[
              { v: "source", l: "Same as source" }, { v: "24", l: "24" }, { v: "30", l: "30" }, { v: "60", l: "60" },
            ]} />
            <Select label="Resolution" value={s.resolution} onChange={(v) => setS({ resolution: v })} options={[
              { v: "source", l: "Source" }, { v: "1080", l: "1080p" }, { v: "720", l: "720p" }, { v: "480", l: "480p" }, { v: "custom", l: "Custom" },
            ]} />
            {s.resolution === "custom" && (
              <div className="grid grid-cols-2 gap-2">
                <TextField label="Width" value={s.customW} onChange={(v) => setS({ customW: v.replace(/\D/g, "") })} placeholder="auto" />
                <TextField label="Height" value={s.customH} onChange={(v) => setS({ customH: v.replace(/\D/g, "") })} placeholder="auto" />
              </div>
            )}
            <Select label="Audio codec" value={s.acodec} onChange={(v) => setS({ acodec: v })} options={[
              { v: "aac", l: "AAC" }, { v: "libmp3lame", l: "MP3" }, { v: "libopus", l: "Opus" }, { v: "none", l: "Mute (ไม่มีเสียง)" },
            ]} />
            <Select label="Audio bitrate" value={s.abitrate} onChange={(v) => setS({ abitrate: v })} options={[
              { v: "96k", l: "96k" }, { v: "128k", l: "128k" }, { v: "160k", l: "160k" }, { v: "192k", l: "192k" },
            ]} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onDuplicate}><Copy size={14} /> ทำสำเนา</button>
            <div className="flex items-center gap-2">
              <span className="text-[.74rem] text-muted">ลำดับ / ลบ</span>
              <RowActions i={i} n={n} onMove={onMove} onDelete={onDelete} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PresetEditor({ value, onChange }: { value: PresetDoc[]; onChange: (v: PresetDoc[]) => void }) {
  const [fresh, setFresh] = useState<string | null>(null);
  const groups = [...new Set(value.map((p) => p.group).filter(Boolean))];

  const add = () => {
    const id = newPresetId();
    const p: PresetDoc = {
      id, title: "พรีเซ็ตใหม่", subtitle: "", group: groups[0] ?? "General", icon: "film", enabled: true,
      settings: { container: "mp4", vcodec: "libx264", speed: "veryfast", rateMode: "crf", crf: 23, fps: "source", resolution: "source", acodec: "aac", abitrate: "128k" },
    };
    p.subtitle = describe({ ...DEFAULT_SETTINGS, ...p.settings });
    setFresh(id);
    onChange([...value, p]);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{value.length} พรีเซ็ต · เปิด {value.filter((p) => p.enabled).length} · ปิดสวิตช์เพื่อซ่อนชั่วคราวโดยไม่ต้องลบ</p>
        <button type="button" className="btn btn-primary btn-sm" onClick={add}><Plus size={15} /> เพิ่มพรีเซ็ต</button>
      </div>
      {value.length === 0 && <div className="panel-soft p-8 text-center text-sm text-muted">ยังไม่มีพรีเซ็ต — กด “เพิ่มพรีเซ็ต”</div>}
      {value.map((p, i) => (
        <PresetRow key={p.id} p={p} i={i} n={value.length} groups={groups} defaultOpen={p.id === fresh}
          onChange={(np) => onChange(value.map((x) => (x.id === p.id ? np : x)))}
          onMove={(d) => {
            const j = i + d;
            if (j < 0 || j >= value.length) return;
            const out = value.slice();
            [out[i], out[j]] = [out[j], out[i]];
            onChange(out);
          }}
          onDelete={() => { if (confirm(`ลบพรีเซ็ต “${p.title}” ?`)) onChange(value.filter((x) => x.id !== p.id)); }}
          onDuplicate={() => {
            const id = newPresetId();
            setFresh(id);
            const out = value.slice();
            out.splice(i + 1, 0, { ...p, id, title: `${p.title} (สำเนา)`, settings: { ...p.settings } });
            onChange(out);
          }}
        />
      ))}
    </div>
  );
}
