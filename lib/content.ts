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
  /** Show the public "X files compressed" counter (read from the Thai doc) */
  showStats: boolean;
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
  /** Optional English labels (fall back to the Thai ones) */
  titleEn?: string;
  subtitleEn?: string;
  groupEn?: string;
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
  showStats: true,
};

export const DEFAULT_CONTENT_EN: SiteContent = {
  siteName: "Framepress",
  tagline: "Video Compressor",
  announcement: "",
  heroEyebrow: "REC • Compress in your browser, no upload",
  heroTitle: "Press every frame.",
  heroHighlight: "frame",
  heroDescription:
    "HandBrake-style video compression and conversion that runs on your own device. Drop a file, pick a preset, hit start and download right away — nothing is uploaded to a server.",
  heroPrimaryCta: "Compress a file",
  heroSecondaryCta: "See presets",
  chips: ["No upload", "H.264 • H.265 • VP9", "Free, no watermark"],
  marquee: ["IN-BROWSER", "NO UPLOAD", "H.264", "H.265 / HEVC", "VP9", "AAC • OPUS • MP3", "TIKTOK 1080P", "DISCORD 8MB", "NO WATERMARK"],
  workspaceEyebrow: "Workspace",
  workspaceTitle: "Drop, tweak, press.",
  workspaceSubtitle: "Everything runs on your device. Close the tab and your files are gone with it.",
  featuresEyebrow: "Why Framepress",
  featuresTitle: "A compressor editors actually use",
  features: [
    { title: "Files never leave your device", body: "FFmpeg WebAssembly runs in a Web Worker — no uploads, no queues, no server costs." },
    { title: "HandBrake-level control", body: "Ready presets for TikTok, YouTube and Discord, or tune codec, speed, CRF, FPS, resolution and audio yourself." },
    { title: "Multi-thread speed", body: "When your browser allows it, the multi-threaded FFmpeg core kicks in automatically — nearly twice as fast." },
  ],
  stepsEyebrow: "How it works",
  steps: [
    { title: "Drop a file", body: "Supports .mp4 .mov .mkv .avi .webm — resolution, bitrate, duration and codecs are read instantly." },
    { title: "Pick a preset", body: "Start from a preset and fine-tune. CRF 23 is the sweet spot between quality and size." },
    { title: "Press start", body: "Watch percent, ETA and live output size. Open the Log Console to see the real FFmpeg command." },
    { title: "Download", body: "Compare before/after and download instantly, or move on to the next file." },
  ],
  faqEyebrow: "FAQ",
  faq: [
    { q: "Why is the first load slow?", a: "The FFmpeg engine (~30MB) downloads once, then your browser caches it." },
    { q: "How big can a file be?", a: "WebAssembly memory is capped around 2GB — files under ~1GB work best." },
    { q: "Why is H.265 slow?", a: "H.265 is several times heavier than H.264. For everyday use pick H.264 + Veryfast." },
    { q: "How does Discord 8MB work?", a: "The bitrate is computed from the clip length and target size so the file stays under the limit." },
  ],
  ctaTitle: "Ready to press your first file?",
  ctaSubtitle: "Free, no watermark, no sign-up, nothing leaves your device.",
  ctaButton: "Let's go",
  footerNote: "Your files are processed on your device only.",
  showStats: true,
};

export const DEFAULT_PRESETS: PresetDoc[] = [
  {
    id: "tiktok", titleEn: "TikTok 1080p", subtitleEn: "H.264 • 1080p • 30 FPS • AAC 128k", groupEn: "Web / Social Media", title: "TikTok 1080p", subtitle: "H.264 • 1080p • 30 FPS • AAC 128k", group: "Web / Social Media", icon: "smartphone", enabled: true,
    settings: { container: "mp4", vcodec: "libx264", speed: "veryfast", rateMode: "crf", crf: 23, fps: "30", resolution: "1080", acodec: "aac", abitrate: "128k" },
  },
  {
    id: "youtube", titleEn: "YouTube 1080p", subtitleEn: "H.264 • 1080p • CRF 20 • AAC 192k", groupEn: "Web / Social Media", title: "YouTube 1080p", subtitle: "H.264 • 1080p • CRF 20 • AAC 192k", group: "Web / Social Media", icon: "monitor", enabled: true,
    settings: { container: "mp4", vcodec: "libx264", speed: "medium", rateMode: "crf", crf: 20, fps: "source", resolution: "1080", acodec: "aac", abitrate: "192k" },
  },
  {
    id: "discord", titleEn: "Discord 8MB", subtitleEn: "Under 8 MB • 720p • 30 FPS", groupEn: "Web / Social Media", title: "Discord 8MB", subtitle: "ขนาดไม่เกิน 8 MB • 720p • 30 FPS", group: "Web / Social Media", icon: "message", enabled: true,
    settings: { container: "mp4", vcodec: "libx264", speed: "veryfast", rateMode: "target", targetSizeMB: 8, fps: "30", resolution: "720", acodec: "aac", abitrate: "96k" },
  },
  {
    id: "fast", titleEn: "Fast Compression", subtitleEn: "Speed first • Ultrafast • CRF 26", groupEn: "General", title: "Fast Compression", subtitle: "เน้นเร็ว • Ultrafast • CRF 26", group: "General", icon: "zap", enabled: true,
    settings: { container: "mp4", vcodec: "libx264", speed: "ultrafast", rateMode: "crf", crf: 26, fps: "source", resolution: "source", acodec: "aac", abitrate: "128k" },
  },
  {
    id: "hq", titleEn: "High Quality", subtitleEn: "Quality first • Slow • CRF 18 • AAC 192k", groupEn: "General", title: "High Quality", subtitle: "เน้นชัด • Slow • CRF 18 • AAC 192k", group: "General", icon: "gem", enabled: true,
    settings: { container: "mp4", vcodec: "libx264", speed: "slow", rateMode: "crf", crf: 18, fps: "source", resolution: "source", acodec: "aac", abitrate: "192k" },
  },
];

/** Merge stored data over defaults so new fields added in code never break older Firestore docs. */
export function mergeContent(stored: Partial<SiteContent> | undefined | null, defaults: SiteContent = DEFAULT_CONTENT): SiteContent {
  const out = { ...defaults };
  if (!stored) return out;
  for (const k of Object.keys(defaults) as (keyof SiteContent)[]) {
    const v = stored[k];
    if (v === undefined || v === null) continue;
    if (Array.isArray(defaults[k]) !== Array.isArray(v) || typeof defaults[k] !== typeof v) continue;
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
      ...(p.titleEn ? { titleEn: String(p.titleEn) } : {}),
      ...(p.subtitleEn ? { subtitleEn: String(p.subtitleEn) } : {}),
      ...(p.groupEn ? { groupEn: String(p.groupEn) } : {}),
    }));
}

export function newPresetId(): string {
  return "p_" + Math.random().toString(36).slice(2, 9);
}
