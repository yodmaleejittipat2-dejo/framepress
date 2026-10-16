"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, Check, Clapperboard, Music, Package, SlidersHorizontal, Sparkles, SquareTerminal, VolumeX } from "lucide-react";
import CommandEditor from "./CommandEditor";
import { useStore } from "@/lib/store";
import { presetLabel, useSite } from "@/lib/site";
import { useLang, useT } from "@/lib/i18n";
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
  const t = useT();
  const lang = useLang((st) => st.lang);
  const trim = useStore((st) => st.trim);
  const s = useStore((st) => st.settings);
  const meta = useStore((st) => st.meta);
  const patch = useStore((st) => st.patchSettings);
  const applyPreset = useStore((st) => st.applyPreset);
  const locked = useStore((st) => st.status === "processing");
  const multiThread = useStore((st) => st.engine.multiThread);
  const presets = useSite((st) => st.presets);
  const mode = useStore((st) => st.mode);
  const setMode = useStore((st) => st.setMode);
  const set = (p: Partial<Settings>) => patch(p);
  const { warnings } = resolveCompat(s);

  const groups = useMemo(() => {
    const m = new Map<string, typeof presets>();
    presets.filter((p) => p.enabled).forEach((p) => { const g = presetLabel(p, lang).group; m.set(g, [...(m.get(g) ?? []), p]); });
    return [...m.entries()];
  }, [presets, lang]);
  const active = presets.find((p) => p.id === s.presetId);

  const crfFill = ((s.crf - 18) / 14) * 100;
  const audioKbps = s.acodec === "none" ? 0 : parseInt(s.abitrate, 10);
  const outLen = trim ? trim.end - trim.start : meta?.duration ?? 0;
  const vKbps = outLen ? targetVideoKbps(s.targetSizeMB, outLen, audioKbps) : null;

  return (
    <aside id="presets" className="panel scroll-mt-28 p-5 sm:p-6 lg:sticky lg:top-24" aria-label="Settings">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="kicker">Settings</div>
          <h3 className="mt-2 flex items-center gap-2 text-lg font-semibold"><SlidersHorizontal size={18} /> {t("st.title")}</h3>
        </div>
        {mode === "command" ? <span className="tag tag-accent"><SquareTerminal size={12} /> CLI</span>
          : active ? <span className="tag tag-accent"><Check size={12} /> {presetLabel(active, lang).title}</span> : <span className="tag">Custom</span>}
      </div>

      {/* mode switch: guided settings vs. raw ffmpeg command */}
      <div className="mt-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("st.title")}>
        {([
          ["preset", SlidersHorizontal, t("st.easy"), t("st.easySub")],
          ["command", SquareTerminal, t("st.cmd"), t("st.cmdSub")],
        ] as const).map(([m, Icon, title, sub]) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} disabled={locked} onClick={() => setMode(m)}
            className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${mode === m ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-line-strong"}`}>
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${mode === m ? "bg-accent text-accent-ink" : "border border-line"}`}><Icon size={17} /></span>
            <span className="min-w-0">
              <b className="block text-sm font-semibold">{title}</b>
              <span className="block truncate text-[.72rem] text-muted">{sub}</span>
            </span>
          </button>
        ))}
      </div>

      {mode === "command" ? <div className="mt-5"><CommandEditor /></div> : (<>
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
            {groups.length === 0 && <Hint>{t("st.noPresets")}</Hint>}
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
                          <b className="block text-sm font-semibold">{presetLabel(p, lang).title}</b>
                          <span className={`block truncate text-[.75rem] ${on ? "opacity-70" : "text-muted"}`}>{presetLabel(p, lang).subtitle}</span>
                        </span>
                        {on && <Check size={18} className="ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </Field>
            ))}
            <Hint>{t("st.presetHint")}</Hint>
          </>
        )}

        {tab === "video" && (
          <>
            <Field label="Codec">
              <Options value={s.vcodec === "libvpx" ? "libvpx-vp9" : s.vcodec} onChange={(v) => set({ vcodec: v })} options={[
                { v: "libx264", label: "H.264", hint: "libx264" },
                { v: "libx265", label: "H.265 / HEVC", hint: "libx265" },
                { v: "libvpx-vp9", label: "VP9", hint: "libvpx-vp9 (WebM)" },
              ]} />
              {s.vcodec === "libx265" && !multiThread && <Hint warn>{t("st.x265slow")}</Hint>}
              {s.vcodec === "libvpx-vp9" && <Hint>{t("st.vp9note")}</Hint>}
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
                <div className="mt-2 flex justify-between mono text-[.64rem] text-muted"><span>{t("st.crf18")}</span><span>{t("st.crf23")}</span><span>{t("st.crf32")}</span></div>
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
                {vKbps !== null && vKbps < 250 && <Hint warn>{t("st.lowBitrate")}</Hint>}
              </Field>
            )}
            <Field label="Frame rate (FPS)">
              <Options value={s.fps} onChange={(v) => set({ fps: v })} options={[
                { v: "source", label: t("st.same") }, { v: "24", label: "24" }, { v: "30", label: "30" }, { v: "60", label: "60" },
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
              ) : s.resolution !== "source" && <Hint>{t("st.resNote", { n: s.resolution })}</Hint>}
            </Field>
          </>
        )}

        {tab === "audio" && (
          <>
            <Field label="Codec">
              <Options value={s.acodec} onChange={(v) => set({ acodec: v })} options={[
                { v: "aac", label: "AAC" }, { v: "libmp3lame", label: "MP3" }, { v: "libopus", label: "Opus" }, { v: "none", label: "Mute" },
              ]} />
              {s.acodec === "none" && <p className="mt-3 flex items-center gap-2 text-[.76rem] text-muted"><VolumeX size={14} /> {t("st.mute")}</p>}
            </Field>
            <Field label="Bitrate">
              <Options value={s.abitrate} disabled={s.acodec === "none"} onChange={(v) => set({ abitrate: v })} options={[
                { v: "96k", label: "96k" }, { v: "128k", label: "128k" }, { v: "160k", label: "160k" }, { v: "192k", label: "192k" },
              ]} />
            </Field>
          </>
        )}

        {tab === "output" && (
          <Field label={t("st.container")}>
            <Options value={s.container} onChange={(v) => set({ container: v })} options={[
              { v: "mp4", label: "MP4" }, { v: "mov", label: "MOV" }, { v: "mkv", label: "MKV" }, { v: "webm", label: "WEBM" },
            ]} />
            <Hint>{t("st.containerNote")}</Hint>
          </Field>
        )}

        {warnings.length > 0 && (
          <div className="rounded-xl border border-warn/40 bg-warn/10 p-3.5 text-[.76rem] leading-relaxed text-warn">
            {warnings.map((w) => <p key={w} className="flex gap-2"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> {w}</p>)}
          </div>
        )}
      </fieldset>
      </>)}
    </aside>
  );
}
