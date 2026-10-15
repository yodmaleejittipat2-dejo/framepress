"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, Check, Clapperboard, Music, Package, SlidersHorizontal, Sparkles, VolumeX } from "lucide-react";
import { useStore } from "@/lib/store";
import { useSite } from "@/lib/site";
import { resolveCompat, targetVideoKbps } from "@/lib/buildArgs";
import type { Settings } from "@/lib/types";
import PresetIcon from "./PresetIcon";

type Tab = "presets" | "video" | "audio" | "output";
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "presets", label: "Presets", icon: Sparkles },
  { id: "video", label: "Video", icon: Clapperboard },
  { id: "audio", label: "Audio", icon: Music },
  { id: "output", label: "Output", icon: Package },
];

function Options<T extends string>({ value, options, onChange, disabled }: {
  value: T; options: { v: T; label: string; hint?: string }[]; onChange: (v: T) => void; disabled?: boolean;
}) {
  return (
    <div className="opt-row">
      {options.map((o) => (
        <button key={o.v} type="button" className="opt" aria-pressed={value === o.v} disabled={disabled} title={o.hint}
          onClick={() => onChange(o.v)} style={disabled ? { opacity: 0.4, cursor: "not-allowed" } : undefined}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, right, children }: { label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <div className="field-label"><span>{label}</span>{right}</div>
      {children}
    </div>
  );
}

const Hint = ({ children, warn }: { children: React.ReactNode; warn?: boolean }) => (
  <p className={`mt-2 text-[.74rem] leading-relaxed ${warn ? "text-warn" : "text-muted"}`}>{children}</p>
);

export default function SettingsPanel() {
  const [tab, setTab] = useState<Tab>("presets");
  const s = useStore((st) => st.settings);
  const meta = useStore((st) => st.meta);
  const patch = useStore((st) => st.patchSettings);
  const applyPreset = useStore((st) => st.applyPreset);
  const locked = useStore((st) => st.status === "processing");
  const multiThread = useStore((st) => st.engine.multiThread);
  const presets = useSite((st) => st.presets);
  const set = (p: Partial<Settings>) => patch(p);
  const { warnings } = resolveCompat(s);

  const groups = useMemo(() => {
    const m = new Map<string, typeof presets>();
    presets.filter((p) => p.enabled).forEach((p) => m.set(p.group, [...(m.get(p.group) ?? []), p]));
    return [...m.entries()];
  }, [presets]);
  const active = presets.find((p) => p.id === s.presetId);

  const crfFill = ((s.crf - 18) / 14) * 100;
  const audioKbps = s.acodec === "none" ? 0 : parseInt(s.abitrate, 10);
  const vKbps = meta?.duration ? targetVideoKbps(s.targetSizeMB, meta.duration, audioKbps) : null;

  return (
    <aside id="presets" className="panel scroll-mt-28 p-5 sm:p-6 lg:sticky lg:top-24" aria-label="Settings">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="kicker">Settings</div>
          <h3 className="mt-2 flex items-center gap-2 text-lg font-semibold"><SlidersHorizontal size={18} /> ตั้งค่าการบีบอัด</h3>
        </div>
        {active ? <span className="tag tag-accent"><Check size={12} /> {active.title}</span> : <span className="tag">Custom</span>}
      </div>

      <div className="seg mt-5" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            <Icon size={14} /> <span className="hidden min-[400px]:inline">{label}</span>
          </button>
        ))}
      </div>

      <fieldset disabled={locked} className={`mt-5 space-y-5 ${locked ? "pointer-events-none opacity-50" : ""}`}>
        {tab === "presets" && (
          <>
            {groups.length === 0 && <Hint>ยังไม่มีพรีเซ็ต — ตั้งค่าเองได้ในแท็บ Video / Audio</Hint>}
            {groups.map(([g, items]) => (
              <Field key={g} label={g}>
                <div className="grid gap-2">
                  {items.map((p) => {
                    const on = s.presetId === p.id;
                    return (
                      <button key={p.id} type="button" onClick={() => applyPreset(p)}
                        className={`spot lift relative flex items-center gap-3.5 rounded-2xl border p-3 text-left ${on ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface"}`}>
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${on ? "bg-black/10" : "border border-line bg-surface-2"}`}>
                          <PresetIcon name={p.icon} />
                        </span>
                        <span className="min-w-0">
                          <b className="block text-sm font-semibold">{p.title}</b>
                          <span className={`block truncate text-[.75rem] ${on ? "opacity-70" : "text-muted"}`}>{p.subtitle}</span>
                        </span>
                        {on && <Check size={18} className="ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </Field>
            ))}
            <Hint>เลือกพรีเซ็ตแล้วปรับละเอียดต่อได้ในแท็บ Video / Audio — เมื่อแก้ค่าใด ๆ จะเปลี่ยนเป็นโหมด Custom</Hint>
          </>
        )}

        {tab === "video" && (
          <>
            <Field label="Codec">
              <Options value={s.vcodec === "libvpx" ? "libvpx-vp9" : s.vcodec} onChange={(v) => set({ vcodec: v })} options={[
                { v: "libx264", label: "H.264", hint: "libx264 — เข้ากันได้ทุกอุปกรณ์" },
                { v: "libx265", label: "H.265 / HEVC", hint: "libx265 — ไฟล์เล็กกว่า แต่เข้ารหัสช้ากว่า" },
                { v: "libvpx-vp9", label: "VP9", hint: "libvpx-vp9 — เหมาะกับเว็บ (WebM)" },
              ]} />
              {s.vcodec === "libx265" && !multiThread && <Hint warn>H.265 ในโหมด single-thread ช้ามาก — แนะนำ Ultrafast + ลดความละเอียด</Hint>}
              {s.vcodec === "libvpx-vp9" && <Hint>VP9 ใน ffmpeg.wasm บางเวอร์ชันไม่เสถียร — ถ้าล้มเหลวระบบจะสลับเป็น VP8 (WebM) ให้อัตโนมัติ</Hint>}
            </Field>
            <Field label="Preset / Speed">
              <Options value={s.speed} onChange={(v) => set({ speed: v })} options={[
                { v: "ultrafast", label: "Ultrafast" }, { v: "veryfast", label: "Veryfast" }, { v: "medium", label: "Medium" }, { v: "slow", label: "Slow" },
              ]} />
            </Field>
            <Field label="Rate control">
              <Options value={s.rateMode} onChange={(v) => set({ rateMode: v })} options={[
                { v: "crf", label: "Constant Quality (CRF)" }, { v: "target", label: "Target file size" },
              ]} />
            </Field>
            {s.rateMode === "crf" ? (
              <Field label="Quality factor (CRF)" right={<span className="tag tag-accent">{s.crf}</span>}>
                <input type="range" min={18} max={32} step={1} value={s.crf} className="range" style={{ ["--fill" as string]: `${crfFill}%` }}
                  onChange={(e) => set({ crf: Number(e.target.value) })} aria-label="CRF" />
                <div className="mt-2 flex justify-between mono text-[.64rem] text-muted"><span>18 ชัดมาก</span><span>23 แนะนำ</span><span>32 ไฟล์เล็ก</span></div>
              </Field>
            ) : (
              <Field label="Target size (MB)" right={vKbps ? <span className="tag">≈ {vKbps.toLocaleString()} kb/s</span> : null}>
                <div className="flex flex-wrap items-center gap-2">
                  <input type="number" min={1} step={1} className="input max-w-[120px]" value={s.targetSizeMB}
                    onChange={(e) => set({ targetSizeMB: Math.max(1, Number(e.target.value) || 1) })} />
                  {[8, 10, 25, 50].map((n) => (
                    <button key={n} type="button" className="opt" aria-pressed={s.targetSizeMB === n} onClick={() => set({ targetSizeMB: n })}>{n}MB</button>
                  ))}
                </div>
                {vKbps !== null && vKbps < 250 && <Hint warn>วิดีโอยาวเกินขนาดเป้าหมาย บิตเรตต่ำมาก ควรลดความละเอียดเป็น 720p/480p</Hint>}
              </Field>
            )}
            <Field label="Frame rate (FPS)">
              <Options value={s.fps} onChange={(v) => set({ fps: v })} options={[
                { v: "source", label: "Same as source" }, { v: "24", label: "24" }, { v: "30", label: "30" }, { v: "60", label: "60" },
              ]} />
            </Field>
            <Field label="Resolution">
              <Options value={s.resolution} onChange={(v) => set({ resolution: v })} options={[
                { v: "source", label: "Source" }, { v: "1080", label: "1080p" }, { v: "720", label: "720p" }, { v: "480", label: "480p" }, { v: "custom", label: "Custom" },
              ]} />
              {s.resolution === "custom" ? (
                <div className="mt-3 flex items-center gap-2">
                  <input className="input" inputMode="numeric" placeholder="Width (auto)" value={s.customW} onChange={(e) => set({ customW: e.target.value.replace(/\D/g, "") })} />
                  <span className="text-muted">×</span>
                  <input className="input" inputMode="numeric" placeholder="Height (auto)" value={s.customH} onChange={(e) => set({ customH: e.target.value.replace(/\D/g, "") })} />
                </div>
              ) : s.resolution !== "source" && <Hint>ปรับด้านสั้นเป็น {s.resolution}px รักษาสัดส่วนเดิม (รองรับคลิปแนวตั้ง) ไม่ขยายภาพเล็กให้ใหญ่ขึ้น</Hint>}
            </Field>
          </>
        )}

        {tab === "audio" && (
          <>
            <Field label="Codec">
              <Options value={s.acodec} onChange={(v) => set({ acodec: v })} options={[
                { v: "aac", label: "AAC" }, { v: "libmp3lame", label: "MP3" }, { v: "libopus", label: "Opus" }, { v: "none", label: "Mute" },
              ]} />
              {s.acodec === "none" && <p className="mt-3 flex items-center gap-2 text-[.76rem] text-muted"><VolumeX size={14} /> ตัดเสียงออกทั้งหมด</p>}
            </Field>
            <Field label="Bitrate">
              <Options value={s.abitrate} disabled={s.acodec === "none"} onChange={(v) => set({ abitrate: v })} options={[
                { v: "96k", label: "96k" }, { v: "128k", label: "128k" }, { v: "160k", label: "160k" }, { v: "192k", label: "192k" },
              ]} />
            </Field>
          </>
        )}

        {tab === "output" && (
          <Field label="Container (แปลงไฟล์)">
            <Options value={s.container} onChange={(v) => set({ container: v })} options={[
              { v: "mp4", label: "MP4" }, { v: "mov", label: "MOV" }, { v: "mkv", label: "MKV" }, { v: "webm", label: "WEBM" },
            ]} />
            <Hint>MP4 + H.264 + AAC เปิดได้ทุกที่ (มือถือ, CapCut, Premiere) — WebM ใช้ VP9 + Opus</Hint>
          </Field>
        )}

        {warnings.length > 0 && (
          <div className="rounded-xl border border-warn/40 bg-warn/10 p-3.5 text-[.76rem] leading-relaxed text-warn">
            {warnings.map((w) => <p key={w} className="flex gap-2"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> {w}</p>)}
          </div>
        )}
      </fieldset>
    </aside>
  );
}
