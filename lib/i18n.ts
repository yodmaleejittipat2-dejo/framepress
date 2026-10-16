"use client";
import { create } from "zustand";

/* ================================================================
 * UI strings (buttons, labels, messages). Website *content* (hero text,
 * FAQ, presets…) is edited per-language in the Admin instead.
 * ================================================================ */
export type Lang = "th" | "en";

const th = {
  // nav
  "nav.start": "เริ่มเลย",
  "nav.menu": "เมนู",
  "nav.lang": "English",
  "theme.toLight": "โหมดสว่าง",
  "theme.toDark": "โหมดมืด",
  // uploader
  "up.title": "ลากวิดีโอมาวางตรงนี้",
  "up.titleDrag": "ปล่อยไฟล์ได้เลย",
  "up.sub": "หรือคลิกเพื่อเลือกไฟล์ — เลือกหลายไฟล์ได้ · ไฟล์จะไม่ออกจากเครื่องคุณ",
  "up.button": "เลือกไฟล์",
  "up.unsupported": "ไม่รองรับไฟล์ .{ext} — รองรับ {list}",
  // file info
  "fi.source": "Source file",
  "fi.change": "เปลี่ยนไฟล์",
  "fi.reading": "กำลังอ่านไฟล์…",
  "fi.local": "Local only",
  "fi.noAudio": "ไม่มีเสียง",
  // trim
  "trim.title": "ตัดช่วงคลิป",
  "trim.start": "เริ่ม",
  "trim.end": "จบ",
  "trim.length": "ความยาว",
  "trim.setStart": "ตั้งจุดเริ่ม = ตำแหน่งวิดีโอ",
  "trim.setEnd": "ตั้งจุดจบ = ตำแหน่งวิดีโอ",
  "trim.reset": "ใช้ทั้งคลิป",
  "trim.active": "จะส่งออกเฉพาะช่วง {a} – {b}",
  "trim.cmdNote": "โหมดคำสั่ง FFmpeg ไม่ใช้ช่วงที่ตัดนี้ — ใส่ -ss / -t ในคำสั่งเอง",
  // process
  "pr.title": "Process",
  "pr.pickFirst": "เลือกไฟล์วิดีโอก่อน แล้วปุ่มเริ่มประมวลผลจะปรากฏที่นี่",
  "pr.loadingEngine": "กำลังโหลด FFmpeg engine (~30MB ครั้งแรก แล้วจะแคชไว้)…",
  "pr.probing": "กำลังอ่านข้อมูลไฟล์…",
  "pr.start": "เริ่มบีบอัด / แปลงไฟล์",
  "pr.runCmd": "รันคำสั่ง FFmpeg",
  "pr.cmdInvalid": "คำสั่งยังไม่ถูกต้อง — ดูรายละเอียดที่ช่องคำสั่ง",
  "pr.localNote": "ประมวลผลบนเครื่องคุณ — ความเร็วขึ้นกับ CPU และความยาวคลิป",
  "pr.eta": "ETA",
  "pr.elapsed": "ใช้ไป",
  "pr.original": "ต้นฉบับ",
  "pr.written": "เขียนแล้ว · live",
  "pr.cancel": "ยกเลิก",
  "pr.retry": "ลองใหม่",
  "pr.newFile": "เลือกไฟล์ใหม่",
  "pr.error": "เกิดข้อผิดพลาด",
  "pr.smaller": "เล็กลงจากต้นฉบับ",
  "pr.bigger": "ใหญ่ขึ้นจากต้นฉบับ (ลองเพิ่ม CRF หรือลดความละเอียด)",
  "pr.took": "ใช้เวลา",
  "pr.download": "ดาวน์โหลด",
  "pr.again": "เริ่มใหม่",
  // estimate / sample
  "est.title": "ประมาณขนาดไฟล์",
  "est.target": "≈ {size} (ตามขนาดเป้าหมาย)",
  "est.unknown": "กด “ทดลอง 5 วินาที” เพื่อประมาณขนาดและดูคุณภาพก่อน",
  "est.fromSample": "≈ {size} ทั้งไฟล์ (คำนวณจากการทดลอง {sec} วิ)",
  "est.test": "ทดลอง 5 วินาที",
  "est.testing": "กำลังทดลอง…",
  "est.sampleOf": "ตัวอย่าง {sec} วินาที · {size}",
  "est.close": "ปิดตัวอย่าง",
  // settings
  "st.title": "ตั้งค่าการบีบอัด",
  "st.easy": "โหมดง่าย",
  "st.easySub": "พรีเซ็ต + ปรับค่า",
  "st.cmd": "คำสั่ง FFmpeg",
  "st.cmdSub": "วางคำสั่งเอง",
  "st.noPresets": "ยังไม่มีพรีเซ็ต — ตั้งค่าเองได้ในแท็บ Video / Audio",
  "st.presetHint": "เลือกพรีเซ็ตแล้วปรับละเอียดต่อได้ในแท็บ Video / Audio — เมื่อแก้ค่าใด ๆ จะเปลี่ยนเป็นโหมด Custom",
  "st.x265slow": "H.265 ในโหมด single-thread ช้ามาก — แนะนำ Ultrafast + ลดความละเอียด",
  "st.vp9note": "VP9 ใน ffmpeg.wasm บางเวอร์ชันไม่เสถียร — ถ้าล้มเหลวระบบจะสลับเป็น VP8 (WebM) ให้อัตโนมัติ",
  "st.crf18": "18 ชัดมาก",
  "st.crf23": "23 แนะนำ",
  "st.crf32": "32 ไฟล์เล็ก",
  "st.lowBitrate": "วิดีโอยาวเกินขนาดเป้าหมาย บิตเรตต่ำมาก ควรลดความละเอียดเป็น 720p/480p",
  "st.resNote": "ปรับด้านสั้นเป็น {n}px รักษาสัดส่วนเดิม (รองรับคลิปแนวตั้ง) ไม่ขยายภาพเล็กให้ใหญ่ขึ้น",
  "st.mute": "ตัดเสียงออกทั้งหมด",
  "st.container": "Container (แปลงไฟล์)",
  "st.containerNote": "MP4 + H.264 + AAC เปิดได้ทุกที่ (มือถือ, CapCut, Premiere) — WebM ใช้ VP9 + Opus",
  "st.same": "Same as source",
  // command
  "cmd.label": "วางคำสั่งแล้วกดรัน",
  "cmd.examples": "ตัวอย่างคำสั่ง",
  "cmd.ready": "คำสั่งพร้อมรัน",
  "cmd.pickFirst": "— เลือกไฟล์ก่อน —",
  "cmd.extra": "ไฟล์เพิ่มเติม (โลโก้, เพลง, ซับไตเติล…)",
  "cmd.extraHint": "แนบไฟล์แล้วใช้ชื่อไฟล์นั้นในคำสั่ง เช่น -i logo.png",
  "cmd.addExtra": "แนบไฟล์",
  "cmd.tip1": "ไฟล์หลัก: ชื่อหลัง -i ตัวแรกจะเป็นอะไรก็ได้ ระบบใช้ไฟล์ที่คุณอัปโหลด",
  "cmd.tip2": "ไฟล์เพิ่มเติม: ใช้ชื่อไฟล์ตรงกับที่แนบไว้ (เช่น -i logo.png)",
  "cmd.tip3": "ชื่อไฟล์ท้ายคำสั่งคือชื่อไฟล์ที่ได้ดาวน์โหลด · 1 output ต่อคำสั่ง · FFmpeg 5.1",
  // queue
  "q.title": "คิวงาน",
  "q.files": "{n} ไฟล์",
  "q.add": "เพิ่มไฟล์",
  "q.startAll": "เริ่มทั้งหมด",
  "q.stop": "หยุด",
  "q.clear": "ล้างคิว",
  "q.dlAll": "ดาวน์โหลดทั้งหมด (.zip)",
  "q.zipping": "กำลังรวมไฟล์…",
  "q.waiting": "รอคิว",
  "q.running": "กำลังทำ",
  "q.done": "เสร็จ",
  "q.failed": "ล้มเหลว",
  "q.remove": "ลบออกจากคิว",
  "q.summary": "เสร็จ {done}/{total} · ลดลงรวม {saved}",
  "q.note": "ทุกไฟล์ใช้การตั้งค่าด้านขวาเดียวกัน · ตัดช่วงคลิปใช้ได้เฉพาะโหมดไฟล์เดียว",
  // log
  "log.title": "Log Console",
  "log.sub": "ดูคำสั่ง FFmpeg CLI ที่ทำงานอยู่จริง",
  "log.lines": "บรรทัด",
  "log.empty": "ยังไม่มี log — เลือกไฟล์เพื่อเริ่ม",
  "log.clear": "ล้าง log",
  "log.copy": "คัดลอกคำสั่ง",
  // stats
  "stats.files": "{n} ไฟล์ถูกบีบแล้ว",
  "stats.saved": "ประหยัดไป {size}",
  // browser check
  "bc.inapp": "คุณกำลังเปิดในเบราว์เซอร์ของแอป ซึ่งอาจบีบไฟล์ไม่ได้ — แนะนำเปิดใน Chrome หรือ Safari",
  "bc.copy": "คัดลอกลิงก์",
  "bc.copied": "คัดลอกแล้ว",
  "bc.unsupported": "เบราว์เซอร์นี้ไม่รองรับ WebAssembly / Web Worker ที่จำเป็น — กรุณาอัปเดตหรือเปิดด้วย Chrome, Edge, Firefox หรือ Safari รุ่นล่าสุด",
  "bc.ios": "บน iPhone/iPad หน่วยความจำจำกัด แนะนำไฟล์ไม่เกิน ~500MB",
  // footer
  "ft.by": "สร้างโดย",
  "ft.legal": "License & Privacy",
  // errors from the engine
  "err.engine": "โหลด FFmpeg ไม่สำเร็จ: {msg}",
  "err.read": "อ่านไฟล์ไม่สำเร็จ: {msg}",
  "err.oom": "หน่วยความจำของเบราว์เซอร์ไม่พอ (WASM จำกัด ~2GB) — ลองไฟล์ที่เล็กลง หรือลดความละเอียด",
  "err.noOutput": "คำสั่งทำงานจบแต่ไม่มีไฟล์ output — ตรวจสอบคำสั่งอีกครั้ง",
  "err.exit": "FFmpeg หยุดทำงาน (code {code}): {line}",
  "err.exitGeneric": "FFmpeg exited with code {code} — ดูรายละเอียดใน Log Console",
  "close": "ปิด",
};

type Dict = Record<keyof typeof th, string>;

const en: Dict = {
  "nav.start": "Start",
  "nav.menu": "Menu",
  "nav.lang": "ภาษาไทย",
  "theme.toLight": "Light mode",
  "theme.toDark": "Dark mode",
  "up.title": "Drop your video here",
  "up.titleDrag": "Release to add",
  "up.sub": "or click to choose — multiple files OK · nothing leaves your device",
  "up.button": "Choose files",
  "up.unsupported": ".{ext} isn't supported — use {list}",
  "fi.source": "Source file",
  "fi.change": "Change file",
  "fi.reading": "Reading file…",
  "fi.local": "Local only",
  "fi.noAudio": "No audio",
  "trim.title": "Trim",
  "trim.start": "Start",
  "trim.end": "End",
  "trim.length": "Length",
  "trim.setStart": "Set start = playhead",
  "trim.setEnd": "Set end = playhead",
  "trim.reset": "Whole clip",
  "trim.active": "Only {a} – {b} will be exported",
  "trim.cmdNote": "FFmpeg command mode ignores this trim — add -ss / -t to your command",
  "pr.title": "Process",
  "pr.pickFirst": "Choose a video first — the start button will appear here",
  "pr.loadingEngine": "Loading the FFmpeg engine (~30MB the first time, cached afterwards)…",
  "pr.probing": "Reading file info…",
  "pr.start": "Compress / Convert",
  "pr.runCmd": "Run FFmpeg command",
  "pr.cmdInvalid": "The command isn't valid yet — see the command box",
  "pr.localNote": "Runs on your device — speed depends on your CPU and clip length",
  "pr.eta": "ETA",
  "pr.elapsed": "Elapsed",
  "pr.original": "Original",
  "pr.written": "Written · live",
  "pr.cancel": "Cancel",
  "pr.retry": "Try again",
  "pr.newFile": "Choose another file",
  "pr.error": "Something went wrong",
  "pr.smaller": "smaller than the original",
  "pr.bigger": "bigger than the original (raise CRF or lower the resolution)",
  "pr.took": "took",
  "pr.download": "Download",
  "pr.again": "Start over",
  "est.title": "Estimated size",
  "est.target": "≈ {size} (target size)",
  "est.unknown": "Run a 5-second test to estimate the size and check quality first",
  "est.fromSample": "≈ {size} for the whole file (from a {sec}s test)",
  "est.test": "Test 5 seconds",
  "est.testing": "Testing…",
  "est.sampleOf": "{sec}s sample · {size}",
  "est.close": "Close sample",
  "st.title": "Compression settings",
  "st.easy": "Easy mode",
  "st.easySub": "Presets + tweaks",
  "st.cmd": "FFmpeg command",
  "st.cmdSub": "Paste your own",
  "st.noPresets": "No presets yet — use the Video / Audio tabs",
  "st.presetHint": "Pick a preset, then fine-tune in Video / Audio — any change switches to Custom",
  "st.x265slow": "H.265 is very slow in single-thread mode — use Ultrafast and a lower resolution",
  "st.vp9note": "VP9 is unstable in some ffmpeg.wasm builds — if it fails we switch to VP8 (WebM) automatically",
  "st.crf18": "18 sharpest",
  "st.crf23": "23 recommended",
  "st.crf32": "32 smallest",
  "st.lowBitrate": "The clip is long for this target size — bitrate is very low, try 720p/480p",
  "st.resNote": "Short side → {n}px, aspect ratio kept (vertical clips OK), never upscales",
  "st.mute": "Remove all audio",
  "st.container": "Container (convert)",
  "st.containerNote": "MP4 + H.264 + AAC plays everywhere (phones, CapCut, Premiere) — WebM uses VP9 + Opus",
  "st.same": "Same as source",
  "cmd.label": "Paste a command, then run",
  "cmd.examples": "Examples",
  "cmd.ready": "Ready to run",
  "cmd.pickFirst": "— choose a file first —",
  "cmd.extra": "Extra files (logo, music, subtitles…)",
  "cmd.extraHint": "Attach a file and use its name in the command, e.g. -i logo.png",
  "cmd.addExtra": "Attach",
  "cmd.tip1": "Main file: the first -i can be any name — your uploaded file is used",
  "cmd.tip2": "Extra files: use the exact attached file name (e.g. -i logo.png)",
  "cmd.tip3": "The last file name is what you download · 1 output per command · FFmpeg 5.1",
  "q.title": "Queue",
  "q.files": "{n} files",
  "q.add": "Add files",
  "q.startAll": "Start all",
  "q.stop": "Stop",
  "q.clear": "Clear queue",
  "q.dlAll": "Download all (.zip)",
  "q.zipping": "Zipping…",
  "q.waiting": "Waiting",
  "q.running": "Running",
  "q.done": "Done",
  "q.failed": "Failed",
  "q.remove": "Remove from queue",
  "q.summary": "Done {done}/{total} · saved {saved}",
  "q.note": "Every file uses the settings on the right · trimming works in single-file mode",
  "log.title": "Log Console",
  "log.sub": "See the real FFmpeg CLI being run",
  "log.lines": "lines",
  "log.empty": "No logs yet — choose a file to begin",
  "log.clear": "Clear log",
  "log.copy": "Copy command",
  "stats.files": "{n} files compressed",
  "stats.saved": "{size} saved",
  "bc.inapp": "You're in an in-app browser, which may not be able to compress — open this page in Chrome or Safari",
  "bc.copy": "Copy link",
  "bc.copied": "Copied",
  "bc.unsupported": "This browser lacks the WebAssembly / Web Worker features needed — update it or use the latest Chrome, Edge, Firefox or Safari",
  "bc.ios": "iPhone/iPad memory is limited — files under ~500MB work best",
  "ft.by": "Created by",
  "ft.legal": "License & Privacy",
  "err.engine": "Couldn't load FFmpeg: {msg}",
  "err.read": "Couldn't read the file: {msg}",
  "err.oom": "The browser ran out of memory (WASM limit ~2GB) — try a smaller file or lower resolution",
  "err.noOutput": "The command finished but produced no output file — check the command",
  "err.exit": "FFmpeg stopped (code {code}): {line}",
  "err.exitGeneric": "FFmpeg exited with code {code} — see the Log Console",
  "close": "Close",
};

const DICT: Record<Lang, Dict> = { th, en };
export type TKey = keyof typeof th;

function detect(): Lang {
  try {
    const saved = localStorage.getItem("fp-lang");
    if (saved === "th" || saved === "en") return saved;
    // Thai if Thai appears anywhere in the visitor's preferred languages, otherwise English
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
    return langs.some((l) => /^th\b/i.test(l)) ? "th" : "en";
  } catch {
    return "th";
  }
}

export const useLang = create<{ lang: Lang; set: (l: Lang) => void; init: () => void }>((set) => ({
  lang: "th",
  set: (lang) => {
    try { localStorage.setItem("fp-lang", lang); } catch {}
    document.documentElement.lang = lang;
    set({ lang });
  },
  init: () => {
    const lang = detect();
    document.documentElement.lang = lang;
    set({ lang });
  },
}));

function fill(s: string, vars?: Record<string, string | number>) {
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? "")) : s;
}

/** Non-hook translate — for code outside React (the FFmpeg hook). */
export function tr(key: TKey, vars?: Record<string, string | number>): string {
  return fill(DICT[useLang.getState().lang][key] ?? key, vars);
}

/** React hook: const t = useT(); t("pr.start") */
export function useT() {
  const lang = useLang((s) => s.lang);
  return (key: TKey, vars?: Record<string, string | number>) => fill(DICT[lang][key] ?? key, vars);
}
