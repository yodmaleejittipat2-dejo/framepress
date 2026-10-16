"use client";
import { Heart } from "lucide-react";
import { useContent } from "@/lib/site";
import { useT } from "@/lib/i18n";
import BrandMark from "./BrandMark";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function Footer() {
  const c = useContent();
  const t = useT();
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid w-[min(1240px,calc(100%-24px))] gap-8 py-12 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="brand"><BrandMark /> {c.siteName}</div>
          <p className="mt-3 max-w-md text-sm text-muted">{c.footerNote}</p>
          <p className="mt-6 flex items-center gap-2 text-sm">
            {t("ft.by")} <span className="rounded-md bg-accent px-2 py-0.5 font-semibold text-accent-ink">Jittipat_Editz</span>
            <Heart size={14} className="text-accent-text" fill="currentColor" />
          </p>
        </div>
        <div className="flex flex-col gap-3 text-sm text-muted md:items-end">
          <div className="flex flex-wrap gap-4">
            <a href="#compress" className="hover:text-fg">Compress</a>
            <a href="#presets" className="hover:text-fg">Presets</a>
            <a href="#faq" className="hover:text-fg">FAQ</a>
            <a href={`${BASE}/legal/`} className="hover:text-fg">{t("ft.legal")}</a>
            <a href={`${BASE}/admin/`} className="hover:text-fg">Admin</a>
          </div>
          <p className="mono text-[.7rem]">© {new Date().getFullYear()} {c.siteName} · Created by Jittipat_Editz · Powered by FFmpeg.wasm</p>
        </div>
      </div>
    </footer>
  );
}
