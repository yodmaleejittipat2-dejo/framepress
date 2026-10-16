"use client";
import { Languages } from "lucide-react";
import { useLang } from "@/lib/i18n";

export default function LangToggle() {
  const lang = useLang((s) => s.lang);
  const set = useLang((s) => s.set);
  return (
    <button className="icon-btn !flex !w-auto items-center gap-1.5 px-2.5 mono text-[.72rem] font-semibold" onClick={() => set(lang === "th" ? "en" : "th")}
      aria-label={lang === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"} title={lang === "th" ? "English" : "ภาษาไทย"}>
      <Languages size={15} /> {lang === "th" ? "EN" : "TH"}
    </button>
  );
}
