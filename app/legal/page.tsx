"use client";
import { useEffect } from "react";
import { ArrowLeft, Github, Lock, Scale } from "lucide-react";
import Background from "@/components/Background";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/ThemeToggle";
import LangToggle from "@/components/LangToggle";
import { useLang } from "@/lib/i18n";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const REPO = process.env.NEXT_PUBLIC_REPO_URL ?? "";

const LICENSES: [string, string, string][] = [
  ["FFmpeg (ffmpeg-core, incl. libx264, libx265, libvpx, LAME, Opus)", "GPL-2.0-or-later", "https://ffmpeg.org/legal.html"],
  ["ffmpeg.wasm (@ffmpeg/ffmpeg, @ffmpeg/util, @ffmpeg/core)", "MIT (wrapper) · GPL (core build)", "https://github.com/ffmpegwasm/ffmpeg.wasm"],
  ["Next.js · React", "MIT", "https://github.com/vercel/next.js"],
  ["Tailwind CSS", "MIT", "https://github.com/tailwindlabs/tailwindcss"],
  ["Firebase JS SDK", "Apache-2.0", "https://github.com/firebase/firebase-js-sdk"],
  ["Zustand · fflate · coi-serviceworker", "MIT", "https://github.com/pmndrs/zustand"],
  ["Lucide icons", "ISC", "https://lucide.dev/license"],
  ["Space Grotesk · IBM Plex Sans Thai · JetBrains Mono", "SIL Open Font License 1.1", "https://openfontlicense.org"],
];

const T = {
  th: {
    back: "กลับหน้าเว็บ",
    title: "License & Privacy",
    privacyH: "ความเป็นส่วนตัว",
    privacy: [
      "วิดีโอของคุณ **ไม่ถูกอัปโหลด** ไปที่ใดเลย ทุกขั้นตอนประมวลผลด้วย FFmpeg WebAssembly ในเบราว์เซอร์ของคุณเอง และหายไปเมื่อปิดแท็บ",
      "สิ่งที่เก็บไว้ในเครื่องคุณ (localStorage): ธีมสว่าง/มืด, ภาษา, คำสั่ง FFmpeg ล่าสุด และสำเนาข้อความ/พรีเซ็ตของเว็บเพื่อให้เปิดเร็วขึ้น",
      "สิ่งที่ส่งไปที่ Firebase: เฉพาะตัวเลขนับรวม “จำนวนไฟล์ที่บีบ” และ “ขนาดที่ประหยัดได้” แบบไม่ระบุตัวตน — ไม่มีชื่อไฟล์ เนื้อหา IP หรือข้อมูลส่วนตัว",
      "ไม่มีคุกกี้โฆษณา ไม่มีระบบติดตามผู้ใช้",
    ],
    licH: "Open-source licenses",
    lic: "เว็บนี้สร้างจากซอฟต์แวร์โอเพนซอร์สด้านล่าง ตัว FFmpeg core ที่ใช้ถูก build รวม libx264/libx265 จึงอยู่ภายใต้ GPL — ซอร์สโค้ดทั้งหมดของเว็บนี้เปิดให้ดูได้",
    src: "ซอร์สโค้ดของเว็บนี้",
    credit: "สร้างโดย",
  },
  en: {
    back: "Back to site",
    title: "License & Privacy",
    privacyH: "Privacy",
    privacy: [
      "Your videos are **never uploaded** anywhere. Everything runs with FFmpeg WebAssembly inside your own browser and disappears when you close the tab.",
      "Stored on your device (localStorage): light/dark theme, language, your last FFmpeg command and a copy of the site text/presets for faster loading.",
      "Sent to Firebase: only an anonymous running total of “files compressed” and “bytes saved” — no file names, contents, IPs or personal data.",
      "No advertising cookies, no user tracking.",
    ],
    licH: "Open-source licenses",
    lic: "This site is built on the open-source software below. The FFmpeg core is built with libx264/libx265 and is therefore GPL — the full source code of this site is public.",
    src: "Source code of this site",
    credit: "Created by",
  },
};

const md = (s: string) => s.split(/\*\*(.+?)\*\*/g).map((p, i) => (i % 2 ? <b key={i} className="text-fg">{p}</b> : p));

export default function LegalPage() {
  const lang = useLang((s) => s.lang);
  useEffect(() => { useLang.getState().init(); document.title = "License & Privacy — Framepress"; }, []);
  const c = T[lang];

  return (
    <>
      <Background />
      <div className="mx-auto w-[min(860px,calc(100%-24px))] pb-24">
        <header className="mt-4 flex items-center gap-3 rounded-[18px] border border-line bg-[var(--nav-bg)] p-2 pl-3.5 backdrop-blur-xl">
          <a href={`${BASE}/`} className="brand"><BrandMark /> Framepress</a>
          <div className="ml-auto flex items-center gap-2">
            <LangToggle />
            <ThemeToggle />
          </div>
        </header>

        <a href={`${BASE}/`} className="btn btn-ghost btn-sm mt-10"><ArrowLeft size={14} /> {c.back}</a>
        <h1 className="sec-title mt-6">{c.title}</h1>

        <section className="panel-soft mt-8 p-6 sm:p-7">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Lock size={18} className="text-accent-text" /> {c.privacyH}</h2>
          <ul className="mt-4 space-y-3 text-[.92rem] leading-[1.8] text-muted">
            {c.privacy.map((p, i) => <li key={i} className="flex gap-3"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-sm bg-accent" />{md(p)}</li>)}
          </ul>
        </section>

        <section className="panel-soft mt-4 p-6 sm:p-7">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Scale size={18} className="text-accent-text" /> {c.licH}</h2>
          <p className="mt-3 text-[.92rem] leading-[1.8] text-muted">{c.lic}</p>
          {REPO && (
            <a href={REPO} target="_blank" rel="noopener" className="btn btn-inverse btn-sm mt-4"><Github size={14} /> {c.src}</a>
          )}
          <div className="mt-5 divide-y divide-line overflow-hidden rounded-xl border border-line">
            {LICENSES.map(([name, lic, url]) => (
              <a key={name} href={url} target="_blank" rel="noopener" className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-surface-2">
                <span>{name}</span>
                <span className="tag">{lic}</span>
              </a>
            ))}
          </div>
        </section>

        <p className="mt-10 text-center text-sm text-muted">
          {c.credit} <span className="rounded-md bg-accent px-2 py-0.5 font-semibold text-accent-ink">Jittipat_Editz</span>
        </p>
      </div>
    </>
  );
}
