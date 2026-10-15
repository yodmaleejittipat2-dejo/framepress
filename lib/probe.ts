import type { MediaMeta } from "./types";
import { parseTimestamp } from "./format";

/** Parse the stderr of `ffmpeg -i input` into metadata. */
export function parseProbeLog(lines: string[], base: Pick<MediaMeta, "name" | "size" | "type">): MediaMeta {
  const text = lines.join("\n");
  const meta: MediaMeta = { ...base, duration: 0, width: 0, height: 0, bitrate: null, fps: null, vcodec: null, acodec: null };

  const dur = text.match(/Duration:\s*([\d:.]+)/);
  if (dur) meta.duration = parseTimestamp(dur[1]) || 0;

  const br = text.match(/bitrate:\s*(\d+)\s*kb\/s/);
  if (br) meta.bitrate = Number(br[1]);

  const vLine = lines.find((l) => /Stream #\d+:\d+.*Video:/.test(l));
  if (vLine) {
    const c = vLine.match(/Video:\s*([\w-]+)(?:\s*\(([^)]+)\))?/);
    if (c) meta.vcodec = c[2] && !/^0x/.test(c[2]) && !c[2].includes("/") ? `${c[1]} (${c[2]})` : c[1];
    const r = vLine.match(/,\s*(\d{2,5})x(\d{2,5})/);
    if (r) {
      meta.width = Number(r[1]);
      meta.height = Number(r[2]);
    }
    const f = vLine.match(/([\d.]+)\s*fps/) || vLine.match(/([\d.]+)\s*tbr/);
    if (f) meta.fps = Number(f[1]);
    if (!meta.bitrate) {
      const vb = vLine.match(/(\d+)\s*kb\/s/);
      if (vb) meta.bitrate = Number(vb[1]);
    }
  }
  const aLine = lines.find((l) => /Stream #\d+:\d+.*Audio:/.test(l));
  if (aLine) {
    const c = aLine.match(/Audio:\s*([\w-]+)/);
    if (c) meta.acodec = c[1];
  }
  if (!meta.bitrate && meta.duration) meta.bitrate = Math.round((base.size * 8) / 1000 / meta.duration);
  return meta;
}

/** Fast fallback using the browser's <video> element (duration + resolution only). */
export function probeWithVideoElement(file: File): Promise<{ duration: number; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    const done = (r: { duration: number; width: number; height: number } | null) => {
      URL.revokeObjectURL(url);
      resolve(r);
    };
    v.onloadedmetadata = () => done({ duration: v.duration, width: v.videoWidth, height: v.videoHeight });
    v.onerror = () => done(null);
    setTimeout(() => done(null), 4000);
    v.src = url;
  });
}
