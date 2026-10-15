import type { Settings } from "./types";

/* ================================================================
 * Everything an admin can edit without touching code.
 * Stored in Firestore: site/content and site/presets.
 * The defaults below are used until Firebase is configured / when a field is missing.
 * ================================================================ */

export interface TextItem { title: string; body: string }
export interface FaqItem { q: string; a: string }

export interface SiteContent {
  siteName: string;
  tagline: string;
  announcement: string; // empty = hidden
  heroEyebrow: string;
  heroTitle: string;
  heroHighlight: string; // a word inside heroTitle to highlight
  heroDescription: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  chips: string[];
  marquee: string[];
  workspaceEyebrow: string;
  workspaceTitle: string;
  workspaceSubtitle: string;
  featuresEyebrow: string;
  featuresTitle: string;
  features: TextItem[];
  stepsEyebrow: string;
  steps: TextItem[];
  faqEyebrow: string;
  faq: FaqItem[];
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButton: string;
  footerNote: string;
}

export type PresetIcon =
  | "smartphone" | "monitor" | "message" | "zap" | "gem" | "film" | "camera" | "globe" | "flame" | "star" | "music" | "mail";

export const PRESET_ICONS: PresetIcon[] = ["smartphone", "monitor", "message", "zap", "gem", "film", "camera", "globe", "flame", "star", "music", "mail"];

export interface PresetDoc {
  id: string;
  title: string;
  subtitle: string;
  group: string; // free label, e.g. "Web / Social Media"
  icon: PresetIcon;
  enabled: boolean;
  settings: Partial<Omit<Settings, "presetId">>;
}

export const DEFAULT_CONTENT: SiteContent = {
  siteName: "Framepress",
  tagline: "Video Compressor",
  announcement: "",
  heroEyebrow: "REC • บีบอัดในเบราว์เซอร์ ไม่อัปโหลด",
  heroTitle: "Press every frame.",
  heroHighlight: "frame",
  heroDescription:
    "บีบอัดและแปลงไฟล์วิดีโอแบบ HandBrake บนเครื่องของคุณเอง ลากไฟล์วาง เลือกพรีเซ็ต กดประมวลผล แล้วดาวน์โหลดได้ทันที ไฟล์ไม่ถูกส่งขึ้นเซิร์ฟเวอร์",
  heroPrimaryCta: "เริ่มบีบไฟล์",
  heroSecondaryCta: "ดูพรีเซ็ต",
  chips: ["ไม่อัปโหลดไฟล์", "H.264 • H.265 • VP9", "ฟรี ไม่มีลายน้ำ"],
  marquee: ["IN-BROWSER", "NO UPLOAD", "H.264", "H.265 / HEVC", "VP9", "AAC • OPUS • MP3", "TIKTOK 1080P", "DISCORD 8MB", "NO WATERMARK"],
  workspaceEyebrow: "Workspace",
  workspaceTitle: "วางไฟล์ ตั้งค่า แล้วกดบีบ",
  workspaceSubtitle: "ทุกอย่างประมวลผลบนเครื่องคุณ ปิดแท็บเมื่อไหร่ ไฟล์ก็หายไปด้วย",
  featuresEyebrow: "Why Framepress",
  featuresTitle: "เครื่องมือบีบไฟล์ ที่สายตัดต่อใช้จริง",
  features: [
    { title: "ไฟล์ไม่ออกจากเครื่อง", body: "ประมวลผลด้วย FFmpeg WebAssembly ใน Web Worker ไม่มีการอัปโหลด ไม่มีคิวรอ ไม่มีค่าเซิร์ฟเวอร์" },
    { title: "ตั้งค่าละเอียดแบบ HandBrake", body: "พรีเซ็ตพร้อมใช้สำหรับ TikTok, YouTube, Discord หรือปรับเองทั้ง Codec, Speed, CRF, FPS, Resolution และเสียง" },
    { title: "เร็วด้วย Multi-thread", body: "ถ้าเบราว์เซอร์รองรับ จะใช้ FFmpeg แบบหลายเธรดอัตโนมัติ เร็วขึ้นเกือบเท่าตัว" },
  ],
  stepsEyebrow: "How it works",
  steps: [
    { title: "ลากไฟล์วาง", body: "รองรับ .mp4 .mov .mkv .avi .webm ระบบอ่าน Resolution, Bitrate, Duration และ Codec ให้ทันที" },
    { title: "เลือกพรีเซ็ต", body: "เริ่มจากพรีเซ็ตแล้วจูนต่อได้ CRF 23 คือจุดสมดุลระหว่างความชัดกับขนาดไฟล์" },
    { title: "กดประมวลผล", body: "ดูเปอร์เซ็นต์ ETA และขนาดไฟล์แบบสด เปิด Log Console เพื่อดูคำสั่ง FFmpeg จริง" },
    { title: "ดาวน์โหลด", body: "เทียบก่อน/หลัง แล้วดาวน์โหลดได้ทันที หรือเริ่มไฟล์ถัดไป" },
  ],
  faqEyebrow: "FAQ",
  faq: [
    { q: "ทำไมครั้งแรกโหลดนาน?", a: "ต้องดาวน์โหลด FFmpeg engine (~30MB) ครั้งเดียว หลังจากนั้นเบราว์เซอร์จะแคชไว้" },
    { q: "ไฟล์ใหญ่สุดได้เท่าไร?", a: "หน่วยความจำ WebAssembly จำกัดราว 2GB แนะนำไฟล์ไม่เกิน ~1GB" },
    { q: "ทำไม H.265 ช้า?", a: "H.265 ใช้ CPU หนักกว่า H.264 หลายเท่า งานทั่วไปแนะนำ H.264 + Veryfast" },
    { q: "Discord 8MB ทำงานยังไง?", a: "คำนวณบิตเรตจากความยาวคลิปและขนาดเป้าหมาย เพื่อให้ไฟล์ไม่เกินลิมิต" },
  ],
  ctaTitle: "พร้อมบีบไฟล์แรกแล้วหรือยัง?",
  ctaSubtitle: "ฟรี ไม่มีลายน้ำ ไม่ต้องสมัคร ไฟล์ไม่ออกจากเครื่อง",
  ctaButton: "เริ่มเลย",
  footerNote: "ไฟล์ของคุณถูกประมวลผลบนเครื่องคุณเท่านั้น",
};

export const DEFAULT_PRESETS: PresetDoc[] = [
  {
    id: "tiktok", title: "TikTok 1080p", subtitle: "H.264 • 1080p • 30 FPS • AAC 128k", group: "Web / Social Media", icon: "smartphone", enabled: true,
    settings: { container: "mp4", vcodec: "libx264", speed: "veryfast", rateMode: "crf", crf: 23, fps: "30", resolution: "1080", acodec: "aac", abitrate: "128k" },
  },
  {
    id: "youtube", title: "YouTube 1080p", subtitle: "H.264 • 1080p • CRF 20 • AAC 192k", group: "Web / Social Media", icon: "monitor", enabled: true,
    settings: { container: "mp4", vcodec: "libx264", speed: "medium", rateMode: "crf", crf: 20, fps: "source", resolution: "1080", acodec: "aac", abitrate: "192k" },
  },
  {
    id: "discord", title: "Discord 8MB", subtitle: "ขนาดไม่เกิน 8 MB • 720p • 30 FPS", group: "Web / Social Media", icon: "message", enabled: true,
    settings: { container: "mp4", vcodec: "libx264", speed: "veryfast", rateMode: "target", targetSizeMB: 8, fps: "30", resolution: "720", acodec: "aac", abitrate: "96k" },
  },
  {
    id: "fast", title: "Fast Compression", subtitle: "เน้นเร็ว • Ultrafast • CRF 26", group: "General", icon: "zap", enabled: true,
    settings: { container: "mp4", vcodec: "libx264", speed: "ultrafast", rateMode: "crf", crf: 26, fps: "source", resolution: "source", acodec: "aac", abitrate: "128k" },
  },
  {
    id: "hq", title: "High Quality", subtitle: "เน้นชัด • Slow • CRF 18 • AAC 192k", group: "General", icon: "gem", enabled: true,
    settings: { container: "mp4", vcodec: "libx264", speed: "slow", rateMode: "crf", crf: 18, fps: "source", resolution: "source", acodec: "aac", abitrate: "192k" },
  },
];

/** Merge stored data over defaults so new fields added in code never break older Firestore docs. */
export function mergeContent(stored: Partial<SiteContent> | undefined | null): SiteContent {
  const out = { ...DEFAULT_CONTENT };
  if (!stored) return out;
  for (const k of Object.keys(DEFAULT_CONTENT) as (keyof SiteContent)[]) {
    const v = stored[k];
    if (v === undefined || v === null) continue;
    if (Array.isArray(DEFAULT_CONTENT[k]) !== Array.isArray(v)) continue;
    (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

export function sanitizePresets(items: unknown): PresetDoc[] {
  if (!Array.isArray(items)) return DEFAULT_PRESETS;
  return items
    .filter((p): p is PresetDoc => !!p && typeof p === "object" && typeof (p as PresetDoc).id === "string")
    .map((p) => ({
      id: p.id,
      title: String(p.title ?? "Preset"),
      subtitle: String(p.subtitle ?? ""),
      group: String(p.group ?? "General"),
      icon: (PRESET_ICONS as string[]).includes(p.icon) ? p.icon : "film",
      enabled: p.enabled !== false,
      settings: p.settings && typeof p.settings === "object" ? p.settings : {},
    }));
}

export function newPresetId(): string {
  return "p_" + Math.random().toString(36).slice(2, 9);
}
