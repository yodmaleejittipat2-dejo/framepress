import type { Container, MediaMeta, Settings, Trim } from "./types";

export interface BuiltCommand {
  args: string[];
  outName: string;
  mime: string;
  ext: Container;
  warnings: string[];
  effective: Settings;
}

const MIME: Record<Container, string> = {
  mp4: "video/mp4",
  mkv: "video/x-matroska",
  webm: "video/webm",
  mov: "video/quicktime",
};

/** Fix codec/container combinations that would make FFmpeg fail. */
export function resolveCompat(s: Settings): { settings: Settings; warnings: string[] } {
  const out = { ...s };
  const w: string[] = [];

  const isVpx = out.vcodec === "libvpx-vp9" || out.vcodec === "libvpx";
  if (out.container === "webm" && !isVpx) {
    out.vcodec = "libvpx-vp9";
    w.push("WebM รองรับเฉพาะ VP9 — เปลี่ยน Video codec เป็น VP9 ให้อัตโนมัติ");
  }
  if (out.container === "mov" && isVpx) {
    out.container = "mkv";
    w.push("MOV ไม่รองรับ VP9 — เปลี่ยนเป็น MKV ให้อัตโนมัติ");
  }
  if (out.container === "webm" && (out.acodec === "aac" || out.acodec === "libmp3lame")) {
    out.acodec = "libopus";
    w.push("WebM รองรับเสียง Opus เท่านั้น — เปลี่ยนเป็น Opus ให้อัตโนมัติ");
  }
  if (out.container === "mov" && out.acodec === "libopus") {
    out.acodec = "aac";
    w.push("MOV ไม่รองรับ Opus — เปลี่ยนเป็น AAC ให้อัตโนมัติ");
  }
  return { settings: out, warnings: w };
}

function scaleFilter(s: Settings): string | null {
  if (s.resolution === "source") return null;
  if (s.resolution === "custom") {
    const w = parseInt(s.customW, 10);
    const h = parseInt(s.customH, 10);
    if (!w && !h) return null;
    const W = w > 0 ? String(w - (w % 2)) : "-2";
    const H = h > 0 ? String(h - (h % 2)) : "-2";
    return `scale=${W}:${H}:flags=lanczos`;
  }
  // "1080p" = short side 1080 → works for both landscape and vertical (TikTok) videos.
  // min() prevents upscaling small sources.
  const n = Number(s.resolution);
  return `scale='if(gte(iw,ih),-2,min(${n},iw))':'if(gte(iw,ih),min(${n},ih),-2)':flags=lanczos`;
}

/** Map the 18–32 x264-style slider to each encoder's own CRF scale. */
function mapCrf(codec: Settings["vcodec"], crf: number): number {
  if (codec === "libx265") return Math.min(51, crf + 5); // x265 CRF 28 ≈ x264 CRF 23
  if (codec === "libvpx-vp9" || codec === "libvpx") return Math.min(63, Math.round(crf * 1.4)); // 23 → 32
  return crf;
}

export function targetVideoKbps(sizeMB: number, durationSec: number, audioKbps: number): number {
  if (!durationSec) return 1000;
  const totalKbits = sizeMB * 1024 * 8 * 0.94; // ~6% headroom for container overhead
  return Math.max(60, Math.floor(totalKbits / durationSec - audioKbps));
}

/**
 * @param threads  pass a number only on the multi-thread core (explicit thread count is required there)
 */
export function buildArgs(inputName: string, base: string, raw: Settings, meta: MediaMeta | null, threads?: number, trim?: Trim | null, rateDuration?: number): BuiltCommand {
  const { settings: s, warnings } = resolveCompat(raw);
  const ext = s.container;
  const outName = `output.${ext}`;
  const args: string[] = ["-hide_banner", "-y"];
  // Trim: input-side -ss is fast and (when re-encoding) frame-accurate; -t limits the output length
  const tStart = trim ? Math.max(0, trim.start) : 0;
  const tLen = trim ? Math.max(0.1, trim.end - trim.start) : null;
  if (trim && tStart > 0) args.push("-ss", tStart.toFixed(3));
  args.push("-i", inputName);
  if (tLen != null) args.push("-t", tLen.toFixed(3));
  // bitrate budget is spread over this many seconds (a 5-s test still sizes for the whole clip)
  const outDuration = rateDuration ?? tLen ?? meta?.duration ?? 0;

  // ---- Video ----
  const vf: string[] = [];
  const sc = scaleFilter(s);
  if (sc) vf.push(sc);
  if (s.fps !== "source") vf.push(`fps=${s.fps}`);
  if (vf.length) args.push("-vf", vf.join(","));

  args.push("-c:v", s.vcodec);

  const audioKbps = s.acodec === "none" ? 0 : parseInt(s.abitrate, 10);
  if (s.rateMode === "target") {
    let kbps = targetVideoKbps(s.targetSizeMB, outDuration, audioKbps);
    // Short clips: never spend more bits than the source had (would make the file bigger)
    if (meta?.bitrate) kbps = Math.min(kbps, Math.max(200, meta.bitrate - audioKbps));
    args.push("-b:v", `${kbps}k`, "-maxrate", `${kbps}k`, "-bufsize", `${kbps * 2}k`);
  } else if (s.vcodec === "libvpx-vp9") {
    args.push("-crf", String(mapCrf(s.vcodec, s.crf)), "-b:v", "0");
  } else if (s.vcodec === "libvpx") {
    // VP8 constant-quality needs a bitrate ceiling
    const cap = Math.min(meta?.bitrate ? Math.max(500, meta.bitrate) : 4000, 12000);
    args.push("-crf", String(mapCrf(s.vcodec, s.crf)), "-b:v", `${cap}k`);
  } else {
    args.push("-crf", String(mapCrf(s.vcodec, s.crf)));
  }

  if (s.vcodec === "libvpx-vp9" || s.vcodec === "libvpx") {
    const map = { ultrafast: ["realtime", "8"], veryfast: ["realtime", "6"], medium: ["good", "4"], slow: ["good", "2"] } as const;
    const [dl, cpu] = map[s.speed];
    args.push("-deadline", dl, "-cpu-used", cpu);
    if (s.vcodec === "libvpx-vp9") args.push("-row-mt", "1");
  } else {
    args.push("-preset", s.speed);
  }
  if (s.vcodec === "libx265") {
    args.push("-x265-params", "log-level=error");
    if (ext === "mp4" || ext === "mov") args.push("-tag:v", "hvc1"); // plays on Apple devices
  }
  if (threads) args.push("-threads", String(threads));
  args.push("-pix_fmt", "yuv420p");

  // ---- Audio ----
  if (s.acodec === "none") {
    args.push("-an");
  } else {
    if (s.acodec === "libopus") {
      // libopus crashes ffmpeg.wasm 0.12.x on stereo input → use FFmpeg's native Opus encoder
      // (needs -strict -2, 48 kHz, max 2 channels)
      args.push("-c:a", "opus", "-strict", "-2", "-b:a", s.abitrate, "-ar", "48000", "-ac", "2");
    } else {
      args.push("-c:a", s.acodec, "-b:a", s.abitrate);
    }
  }

  if (ext === "mp4" || ext === "mov") args.push("-movflags", "+faststart");
  args.push(outName);

  return { args, outName, mime: MIME[ext], ext, warnings, effective: s };
}

/** Human-readable CLI for the log console. */
export function toCli(args: string[], displayIn?: string): string {
  return (
    "ffmpeg " +
    args
      .map((a, i) => (displayIn && args[i - 1] === "-i" ? displayIn : a))
      .map((a) => (/[\s'(),]/.test(a) ? `"${a}"` : a))
      .join(" ")
  );
}
