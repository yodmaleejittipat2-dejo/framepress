"use client";
import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useContent } from "@/lib/site";
import { useT } from "@/lib/i18n";
import BrandMark from "./BrandMark";
import ThemeToggle from "./ThemeToggle";
import LangToggle from "./LangToggle";

const LINKS = [
  ["#compress", "Compress"],
  ["#presets", "Presets"],
  ["#how", "How it works"],
  ["#faq", "FAQ"],
] as const;

export default function Navbar() {
  const t = useT();
  const status = useStore((s) => s.status);
  const engine = useStore((s) => s.engine);
  const progress = useStore((s) => s.progress);
  const { siteName, tagline } = useContent();
  const [open, setOpen] = useState(false);

  const busy = status === "loading-engine" || status === "probing" || status === "processing";
  const label =
    status === "processing" ? `ENC ${Math.round(progress * 100)}%`
    : status === "loading-engine" ? "LOADING"
    : status === "probing" ? "READING"
    : engine.loaded ? `READY${engine.multiThread ? " · MT" : ""}`
    : "STANDBY";

  return (
    <>
      {status === "processing" && <div id="topProgress" style={{ width: `${progress * 100}%` }} />}
      <nav className="nav">
        <a className="brand" href="#top" aria-label={siteName}>
          <BrandMark />
          <span className="flex flex-col leading-tight">
            {siteName}
            <small className="hidden sm:block">{tagline}</small>
          </span>
        </a>
        <div className="nav-links">
          {LINKS.map(([h, l]) => <a key={h} href={h}>{l}</a>)}
        </div>
        <div className="ml-auto flex items-center gap-2 min-[901px]:ml-0">
          <span className="tag hidden lg:inline-flex" title={engine.source ?? undefined}>
            <i className={`dot ${busy ? "busy" : engine.loaded ? "live" : "idle"}`} /> {label}
          </span>
          <LangToggle />
          <ThemeToggle />
          <button className="icon-btn min-[901px]:hidden" onClick={() => setOpen((o) => !o)} aria-label={t("nav.menu")} aria-expanded={open}>
            {open ? <X size={17} /> : <Menu size={17} />}
          </button>
          <a href="#compress" className="btn btn-primary btn-sm hidden sm:inline-flex">
            {t("nav.start")} <ArrowRight size={15} />
          </a>
        </div>
        {open && (
          <div className="panel pop absolute left-0 right-0 top-[calc(100%+8px)] grid gap-1 p-2 min-[901px]:hidden">
            {LINKS.map(([h, l]) => (
              <a key={h} href={h} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm hover:bg-surface-2">{l}</a>
            ))}
          </div>
        )}
      </nav>
    </>
  );
}
