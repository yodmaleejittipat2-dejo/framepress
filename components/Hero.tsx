"use client";
import { ArrowRight, ShieldCheck, TrendingDown } from "lucide-react";
import { useContent, useSite } from "@/lib/site";
import { useLang, useT } from "@/lib/i18n";
import { formatBytes } from "@/lib/format";
import Corners from "./Corners";

function Title({ text, highlight }: { text: string; highlight: string }) {
  const i = highlight ? text.toLowerCase().indexOf(highlight.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="hl">{text.slice(i, i + highlight.length)}</span>
      {text.slice(i + highlight.length)}
    </>
  );
}

/** Decorative "viewfinder" preview — shows what the tool does at a glance. */
function Viewfinder() {
  const lang = useLang((s) => s.lang);
  return (
    <div className="panel corners fade-up p-4 sm:p-5" style={{ ["--d" as string]: ".25s" }} aria-hidden>
      <Corners />
      <div className="flex items-center justify-between">
        <span className="tag"><i className="rec" /> REC</span>
        <span className="mono text-xs text-muted">00:00:12:08</span>
      </div>
      <div className="relative mt-4 aspect-video overflow-hidden rounded-xl border border-line"
        style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 35%, var(--bg)), var(--bg) 55%, color-mix(in srgb, var(--fg) 12%, var(--bg)))" }}>
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
          {Array.from({ length: 9 }).map((_, i) => <div key={i} className="border border-[color-mix(in_srgb,var(--fg)_8%,transparent)]" />)}
        </div>
        <div className="absolute left-3 top-3 mono text-[.65rem] text-fg/70">1920×1080 · H.264</div>
        <div className="absolute bottom-3 right-3 mono text-[.65rem] text-fg/70">30 FPS</div>
        <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-fg/50" />
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <div className="mb-1.5 flex justify-between mono text-[.68rem] text-muted"><span>BEFORE</span><span>248.6 MB</span></div>
          <div className="bar dim"><i style={{ width: "100%" }} /></div>
        </div>
        <div>
          <div className="mb-1.5 flex justify-between mono text-[.68rem]"><span className="text-muted">AFTER</span><span className="text-accent-text font-semibold">31.2 MB · −87%</span></div>
          <div className="bar"><i style={{ width: "13%" }} /></div>
        </div>
      </div>
      <p className="mt-3 mono text-[.62rem] text-faint">* {lang === "en" ? "illustration" : "ตัวอย่างประกอบ"}</p>
    </div>
  );
}

/** "1,234 files compressed · 56 GB saved" — live from Firestore */
function StatsChip() {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const stats = useSite((s) => s.stats);
  const show = useSite((s) => s.content.showStats);
  if (!show || !stats || stats.files < 1) return null;
  return (
    <span className="chip !border-accent/40 !bg-accent-soft">
      <TrendingDown size={14} className="-ml-1 text-accent-text" />
      {t("stats.files", { n: stats.files.toLocaleString(lang === "th" ? "th-TH" : "en-US") })} · {t("stats.saved", { size: formatBytes(stats.bytesSaved) })}
    </span>
  );
}

export default function Hero() {
  const c = useContent();
  return (
    <header id="top" className="relative pt-28 sm:pt-32">
      {c.announcement && (
        <div className="mx-auto mb-6 w-[min(1240px,calc(100%-24px))]">
          <div className="pop rounded-xl border border-line bg-accent px-4 py-2.5 text-center text-sm font-medium text-accent-ink">{c.announcement}</div>
        </div>
      )}
      <div className="mx-auto grid w-[min(1240px,calc(100%-24px))] items-center gap-10 lg:grid-cols-[1.15fr_.85fr] lg:gap-14">
        <div>
          <div className="kicker fade-up"><i className="rec" /> {c.heroEyebrow}</div>
          <h1 className="fade-up mt-5 text-[clamp(2.8rem,8vw,6rem)] font-bold leading-[.98] tracking-[-.04em]" style={{ ["--d" as string]: ".05s" }}>
            <Title text={c.heroTitle} highlight={c.heroHighlight} />
          </h1>
          <p className="fade-up mt-6 max-w-[560px] text-[1.02rem] leading-[1.85] text-muted" style={{ ["--d" as string]: ".12s" }}>
            {c.heroDescription}
          </p>
          <div className="fade-up mt-8 flex flex-wrap gap-2.5" style={{ ["--d" as string]: ".18s" }}>
            <a href="#compress" className="btn btn-primary btn-lg">{c.heroPrimaryCta} <ArrowRight size={17} /></a>
            <a href="#presets" className="btn btn-ghost btn-lg">{c.heroSecondaryCta}</a>
          </div>
          <div className="fade-up mt-8 flex flex-wrap gap-2" style={{ ["--d" as string]: ".24s" }}>
            {c.chips.map((t, i) => (
              <span key={i} className="chip">{i === 0 && <ShieldCheck size={14} className="-ml-1" />}{t}</span>
            ))}
            <StatsChip />
          </div>
        </div>
        <Viewfinder />
      </div>
    </header>
  );
}
