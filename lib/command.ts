/* ================================================================
 * Custom FFmpeg command mode
 * Users paste a normal ffmpeg CLI line; we tokenize it like a shell,
 * point every `-i` at the uploaded file, pick the output name and
 * patch the few things that crash ffmpeg.wasm.
 * ================================================================ */
import { parseTimestamp } from "./format";

export interface ParsedCommand {
  ok: boolean;
  args: string[]; // final args passed to ffmpeg.exec
  outName: string; // name inside the WASM FS
  displayName: string; // name the user will download
  mime: string;
  ext: string;
  needsSingleThread: boolean;
  /** Seconds of output to expect (for progress %), null = unknown */
  expectedDuration: number | null;
  notes: string[]; // things we changed automatically
  errors: string[]; // problems that stop the run
}

const MIME: Record<string, string> = {
  mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", mkv: "video/x-matroska", webm: "video/webm", avi: "video/x-msvideo",
  ts: "video/mp2t", flv: "video/x-flv", gif: "image/gif", webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", wav: "audio/wav", ogg: "audio/ogg", opus: "audio/ogg", flac: "audio/flac",
};

export const COMMAND_EXAMPLES: { label: string; cmd: string }[] = [
  {
    label: "TikTok 9:16 + ขอบดำ",
    cmd: 'ffmpeg -i input.mp4 -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black" -c:v libx264 -preset veryfast -crf 22 -maxrate 6M -bufsize 12M -pix_fmt yuv420p -c:a aac -b:a 192k -ar 44100 output_tiktok.mp4',
  },
  { label: "ตัดช่วง 5–15 วิ", cmd: "ffmpeg -ss 5 -i input.mp4 -t 10 -c:v libx264 -preset veryfast -crf 20 -c:a aac output_trim.mp4" },
  { label: "แยกเสียงเป็น MP3", cmd: "ffmpeg -i input.mp4 -vn -c:a libmp3lame -b:a 192k output.mp3" },
  { label: "ทำ GIF", cmd: 'ffmpeg -i input.mp4 -t 5 -vf "fps=12,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" output.gif' },
  { label: "เร่ง 2 เท่า", cmd: 'ffmpeg -i input.mp4 -filter:v "setpts=0.5*PTS" -filter:a "atempo=2.0" -c:v libx264 -preset veryfast -crf 23 output_2x.mp4' },
  { label: "ตัดเสียงออก", cmd: "ffmpeg -i input.mp4 -c:v copy -an output_mute.mp4" },
  { label: "ภาพนิ่งเฟรมแรก", cmd: "ffmpeg -i input.mp4 -frames:v 1 -q:v 2 output.jpg" },
];

/** Shell-like split: handles "double", 'single' quotes, \ and ^ line continuations, Windows paths. */
export function tokenize(input: string): { tokens: string[]; error: string | null } {
  const s = input.replace(/\\\r?\n/g, " ").replace(/\^\r?\n/g, " ").replace(/`\r?\n/g, " ").trim();
  const tokens: string[] = [];
  let cur = "";
  let has = false;
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (c === "\\" && quote === '"' && (s[i + 1] === '"' || s[i + 1] === "\\")) cur += s[++i];
      else cur += c;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; has = true; continue; }
    if (/\s/.test(c)) {
      if (has) { tokens.push(cur); cur = ""; has = false; }
      continue;
    }
    // Backslash escapes only quotes/spaces; otherwise it's a Windows path separator
    if (c === "\\" && (s[i + 1] === '"' || s[i + 1] === "'" || s[i + 1] === " ")) { cur += s[++i]; has = true; continue; }
    cur += c;
    has = true;
  }
  if (quote) return { tokens: [], error: `เครื่องหมายคำพูด ${quote} ไม่ได้ปิด` };
  if (has) tokens.push(cur);
  return { tokens, error: null };
}

const baseOf = (p: string) => p.split(/[\\/]/).pop() || p;
const extOf = (p: string) => (baseOf(p).includes(".") ? baseOf(p).split(".").pop()!.toLowerCase() : "");

/** Options that take a value — so we never mistake a value for the output file. */
const NO_VALUE = new Set(["-y", "-n", "-an", "-vn", "-sn", "-dn", "-shortest", "-hide_banner", "-nostdin", "-stats", "-nostats", "-re", "-copyts", "-accurate_seek", "-noaccurate_seek"]);

function toSeconds(v: string | undefined): number | null {
  if (!v) return null;
  if (/^\d+(\.\d+)?$/.test(v)) return Number(v);
  const t = parseTimestamp(v.includes(":") && v.split(":").length === 2 ? `0:${v}` : v);
  return Number.isFinite(t) ? t : null;
}

export function parseCommand(text: string, inputFsName: string, sourceDuration: number | null, threads?: number): ParsedCommand {
  const res: ParsedCommand = {
    ok: false, args: [], outName: "", displayName: "", mime: "application/octet-stream", ext: "",
    needsSingleThread: false, expectedDuration: null, notes: [], errors: [],
  };
  const { tokens, error } = tokenize(text);
  if (error) { res.errors.push(error); return res; }
  let t = tokens;
  if (t[0] && /(^|[\\/])ffmpeg(\.exe)?$/i.test(t[0])) t = t.slice(1);
  if (!t.length) { res.errors.push("ยังไม่มีคำสั่ง"); return res; }

  // ---- find the output: the last token that isn't an option or an option's value ----
  let outIdx = -1;
  for (let i = 0; i < t.length; i++) {
    const a = t[i];
    if (a.startsWith("-") && a.length > 1 && !/^-\d/.test(a)) {
      if (!NO_VALUE.has(a)) i++; // skip its value
      continue;
    }
    outIdx = i;
  }
  if (outIdx < 0 || t[outIdx - 1] === "-i") { res.errors.push("หาชื่อไฟล์ output ไม่เจอ — ใส่ชื่อไฟล์ไว้ท้ายคำสั่ง เช่น output.mp4"); return res; }
  const outRaw = t[outIdx];
  const outBase = baseOf(outRaw);
  res.ext = extOf(outBase);
  if (!res.ext) { res.errors.push(`ไฟล์ output "${outBase}" ต้องมีนามสกุล เช่น .mp4 .mp3 .gif`); return res; }
  if (/%\d*d/.test(outBase)) { res.errors.push("ยังไม่รองรับการส่งออกหลายไฟล์ (image sequence เช่น %03d) — ส่งออกได้ทีละ 1 ไฟล์"); return res; }
  res.displayName = outBase;
  res.outName = `out_custom.${res.ext}`;
  res.mime = MIME[res.ext] ?? "application/octet-stream";

  const body = [...t.slice(0, outIdx), ...t.slice(outIdx + 1)];
  if (outIdx !== t.length - 1) res.notes.push(`ใช้ "${outBase}" เป็นไฟล์ output (ตัวเลือกที่อยู่หลังชื่อไฟล์ถูกย้ายมาไว้ข้างหน้า)`);

  // ---- rewrite inputs, collect timing, patch wasm-unsafe bits ----
  const out: string[] = [];
  let inputs = 0;
  let ss: number | null = null, ssOut: number | null = null, dur: number | null = null, to: number | null = null;
  let hasThreads = false;
  for (let i = 0; i < body.length; i++) {
    const a = body[i];
    const v = body[i + 1];
    if (a === "-i") {
      inputs++;
      if (inputs > 1) { res.errors.push("ตอนนี้รองรับไฟล์ input ได้ 1 ไฟล์ (-i ตัวเดียว)"); return res; }
      if (v === undefined) { res.errors.push("-i ไม่มีชื่อไฟล์ตามหลัง"); return res; }
      if (baseOf(v) !== "input.mp4" && !/^input\./i.test(baseOf(v))) res.notes.push(`"${baseOf(v)}" → ใช้ไฟล์ที่คุณอัปโหลด`);
      out.push("-i", inputFsName);
      i++;
      continue;
    }
    if (a === "-y" || a === "-n" || a === "-hide_banner") continue; // we add our own
    if (a === "-ss") { if (inputs === 0) ss = toSeconds(v); else ssOut = toSeconds(v); }
    if (a === "-t") dur = toSeconds(v);
    if (a === "-to") to = toSeconds(v);
    if (a === "-threads") hasThreads = true;
    if (/^-(c|codec|vcodec)(:v)?$/.test(a) && /^libvpx(-vp9)?$/.test(v ?? "")) res.needsSingleThread = true;
    if (/^-(c|codec|acodec)(:a)?$/.test(a) && v === "libopus") {
      out.push(a, "opus", "-strict", "-2");
      i++;
      if (!body.includes("-ar")) out.push("-ar", "48000");
      res.notes.push("libopus → ตัวเข้ารหัส Opus ของ FFmpeg (libopus ทำให้ ffmpeg.wasm ค้างกับเสียงสเตอริโอ)");
      continue;
    }
    out.push(a);
  }
  if (inputs === 0) { res.errors.push('ต้องมี -i ในคำสั่ง เช่น -i input.mp4'); return res; }

  if (threads && !res.needsSingleThread && !hasThreads) {
    out.push("-threads", String(threads));
    res.notes.push(`เพิ่ม -threads ${threads} (โหมดหลายเธรดของ ffmpeg.wasm ต้องกำหนดจำนวนเธรด)`);
  }

  // expected output length for the progress bar
  const src = sourceDuration ?? null;
  if (dur != null) res.expectedDuration = dur;
  // input-side -ss resets timestamps to 0, so a later -to is already the output length
  else if (to != null) res.expectedDuration = Math.max(0.1, to - (ssOut ?? 0));
  else if (src) res.expectedDuration = Math.max(0.1, src - (ss ?? 0) - (ssOut ?? 0));
  if (/^(jpg|jpeg|png|webp)$/.test(res.ext)) res.expectedDuration = null;

  res.args = ["-hide_banner", "-y", ...out, res.outName];
  res.ok = true;
  return res;
}
