/* ================================================================
 * Custom FFmpeg command mode
 * Users paste a normal ffmpeg CLI line; we tokenize it like a shell,
 * point every `-i` at the uploaded file, pick the output name and
 * patch the few things that crash ffmpeg.wasm.
 * ================================================================ */
import { parseTimestamp } from "./format";
import { useLang } from "./i18n";

/** Parser messages in the visitor's language */
function m(th: string, en: string) {
  try { return useLang.getState().lang === "en" ? en : th; } catch { return th; }
}

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

export const COMMAND_EXAMPLES: { th: string; en: string; cmd: string }[] = [
  {
    th: "TikTok 9:16 + ขอบดำ", en: "TikTok 9:16 + bars",
    cmd: 'ffmpeg -i input.mp4 -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black" -c:v libx264 -preset veryfast -crf 22 -maxrate 6M -bufsize 12M -pix_fmt yuv420p -c:a aac -b:a 192k -ar 44100 output_tiktok.mp4',
  },
  { th: "ตัดช่วง 5–15 วิ", en: "Cut 5–15 s", cmd: "ffmpeg -ss 5 -i input.mp4 -t 10 -c:v libx264 -preset veryfast -crf 20 -c:a aac output_trim.mp4" },
  {
    th: "แปะโลโก้ (แนบ logo.png)", en: "Logo overlay (attach logo.png)",
    cmd: 'ffmpeg -i input.mp4 -i logo.png -filter_complex "[1:v]scale=180:-1[lg];[0:v][lg]overlay=W-w-24:24" -c:v libx264 -preset veryfast -crf 22 -c:a copy output_logo.mp4',
  },
  {
    th: "เปลี่ยนเพลง (แนบ music.mp3)", en: "Swap music (attach music.mp3)",
    cmd: "ffmpeg -i input.mp4 -i music.mp3 -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest output_music.mp4",
  },
  { th: "แยกเสียงเป็น MP3", en: "Extract MP3", cmd: "ffmpeg -i input.mp4 -vn -c:a libmp3lame -b:a 192k output.mp3" },
  { th: "ทำ GIF", en: "Make a GIF", cmd: 'ffmpeg -i input.mp4 -t 5 -vf "fps=12,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" output.gif' },
  { th: "เร่ง 2 เท่า", en: "2× speed", cmd: 'ffmpeg -i input.mp4 -filter:v "setpts=0.5*PTS" -filter:a "atempo=2.0" -c:v libx264 -preset veryfast -crf 23 output_2x.mp4' },
  { th: "ตัดเสียงออก", en: "Mute", cmd: "ffmpeg -i input.mp4 -c:v copy -an output_mute.mp4" },
  { th: "ภาพนิ่งเฟรมแรก", en: "First frame JPG", cmd: "ffmpeg -i input.mp4 -frames:v 1 -q:v 2 output.jpg" },
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

/**
 * @param extras  names of extra files attached in command mode (written to the WASM FS under these exact names)
 */
export function parseCommand(text: string, inputFsName: string, sourceDuration: number | null, threads?: number, extras: string[] = []): ParsedCommand {
  const res: ParsedCommand = {
    ok: false, args: [], outName: "", displayName: "", mime: "application/octet-stream", ext: "",
    needsSingleThread: false, expectedDuration: null, notes: [], errors: [],
  };
  const { tokens, error } = tokenize(text);
  if (error) { res.errors.push(m(error, "Unclosed quote in the command")); return res; }
  let t = tokens;
  if (t[0] && /(^|[\\/])ffmpeg(\.exe)?$/i.test(t[0])) t = t.slice(1);
  if (!t.length) { res.errors.push(m("ยังไม่มีคำสั่ง", "No command yet")); return res; }

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
  if (outIdx < 0 || t[outIdx - 1] === "-i") { res.errors.push(m("หาชื่อไฟล์ output ไม่เจอ — ใส่ชื่อไฟล์ไว้ท้ายคำสั่ง เช่น output.mp4", "No output file found — end the command with a file name, e.g. output.mp4")); return res; }
  const outRaw = t[outIdx];
  const outBase = baseOf(outRaw);
  res.ext = extOf(outBase);
  if (!res.ext) { res.errors.push(m(`ไฟล์ output "${outBase}" ต้องมีนามสกุล เช่น .mp4 .mp3 .gif`, `Output "${outBase}" needs an extension like .mp4 .mp3 .gif`)); return res; }
  if (/%\d*d/.test(outBase)) { res.errors.push(m("ยังไม่รองรับการส่งออกหลายไฟล์ (image sequence เช่น %03d) — ส่งออกได้ทีละ 1 ไฟล์", "Image sequences (%03d) aren't supported — one output file per command")); return res; }
  res.displayName = outBase;
  res.outName = `out_custom.${res.ext}`;
  res.mime = MIME[res.ext] ?? "application/octet-stream";

  const body = [...t.slice(0, outIdx), ...t.slice(outIdx + 1)];
  if (outIdx !== t.length - 1) res.notes.push(m(`ใช้ "${outBase}" เป็นไฟล์ output (ตัวเลือกที่อยู่หลังชื่อไฟล์ถูกย้ายมาไว้ข้างหน้า)`, `Using "${outBase}" as the output (options after it were moved in front)`));

  // ---- rewrite inputs, collect timing, patch wasm-unsafe bits ----
  const out: string[] = [];
  let inputs = 0;
  let ss: number | null = null, ssOut: number | null = null, dur: number | null = null, to: number | null = null;
  let hasThreads = false;
  let mainUsed = false;
  let mainSs: number | null = null, pendingSs: number | null = null;
  for (let i = 0; i < body.length; i++) {
    const a = body[i];
    const v = body[i + 1];
    if (a === "-i") {
      inputs++;
      if (v === undefined) { res.errors.push(m("-i ไม่มีชื่อไฟล์ตามหลัง", "-i has no file name after it")); return res; }
      const name = baseOf(v);
      const extra = extras.find((x) => x.toLowerCase() === name.toLowerCase());
      if (extra) {
        out.push("-i", extra);
      } else if (!mainUsed) {
        mainUsed = true;
        if (!/^input\./i.test(name)) res.notes.push(m(`"${name}" → ใช้ไฟล์ที่คุณอัปโหลด`, `"${name}" → your uploaded file`));
        out.push("-i", inputFsName);
        mainSs = pendingSs;
      } else {
        res.errors.push(m(`ไม่พบไฟล์ "${name}" — แนบไฟล์ชื่อนี้ในช่อง “ไฟล์เพิ่มเติม”`, `"${name}" not found — attach a file with this name under “Extra files”`));
        return res;
      }
      pendingSs = null;
      i++;
      continue;
    }
    if (a === "-y" || a === "-n" || a === "-hide_banner") continue; // we add our own
    if (a === "-ss") {
      // FFmpeg rule: options before an -i belong to that input; after the last -i they're output options
      if (body.indexOf("-i", i + 2) !== -1) pendingSs = toSeconds(v);
      else ssOut = toSeconds(v);
    }
    if (a === "-t") dur = toSeconds(v);
    if (a === "-to") to = toSeconds(v);
    if (a === "-threads") hasThreads = true;
    if (/^-(c|codec|vcodec)(:v)?$/.test(a) && /^libvpx(-vp9)?$/.test(v ?? "")) res.needsSingleThread = true;
    if (/^-(c|codec|acodec)(:a)?$/.test(a) && v === "libopus") {
      out.push(a, "opus", "-strict", "-2");
      i++;
      if (!body.includes("-ar")) out.push("-ar", "48000");
      res.notes.push(m("libopus → ตัวเข้ารหัส Opus ของ FFmpeg (libopus ทำให้ ffmpeg.wasm ค้างกับเสียงสเตอริโอ)", "libopus → FFmpeg's native Opus encoder (libopus hangs ffmpeg.wasm on stereo audio)"));
      continue;
    }
    out.push(a);
  }
  if (inputs === 0 || !mainUsed) { res.errors.push(m("ต้องมี -i ในคำสั่ง เช่น -i input.mp4", "The command needs an -i, e.g. -i input.mp4")); return res; }
  ss = mainSs;

  if (threads && !res.needsSingleThread && !hasThreads) {
    out.push("-threads", String(threads));
    res.notes.push(m(`เพิ่ม -threads ${threads} (โหมดหลายเธรดของ ffmpeg.wasm ต้องกำหนดจำนวนเธรด)`, `Added -threads ${threads} (multi-thread ffmpeg.wasm needs an explicit thread count)`));
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
