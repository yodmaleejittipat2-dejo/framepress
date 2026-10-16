/** "libvpx" (VP8) is used internally as an automatic fallback when VP9 crashes in ffmpeg.wasm */
export type VideoCodec = "libx264" | "libx265" | "libvpx-vp9" | "libvpx";
export type Speed = "ultrafast" | "veryfast" | "medium" | "slow";
export type AudioCodec = "aac" | "libmp3lame" | "libopus" | "none";
export type Container = "mp4" | "mkv" | "webm" | "mov";
export type Fps = "source" | "24" | "30" | "60";
export type Resolution = "source" | "1080" | "720" | "480" | "custom";

export interface Settings {
  presetId: string | null;
  container: Container;
  vcodec: VideoCodec;
  speed: Speed;
  rateMode: "crf" | "target";
  crf: number; // 18–32 (x264 scale)
  targetSizeMB: number;
  fps: Fps;
  resolution: Resolution;
  customW: string;
  customH: string;
  acodec: AudioCodec;
  abitrate: "96k" | "128k" | "160k" | "192k";
}

export interface MediaMeta {
  name: string;
  size: number;
  type: string;
  duration: number; // seconds
  width: number;
  height: number;
  bitrate: number | null; // kb/s (container)
  fps: number | null;
  vcodec: string | null;
  acodec: string | null;
}

export type Status = "idle" | "loading-engine" | "probing" | "ready" | "processing" | "done" | "error";

export interface Result {
  url: string;
  name: string;
  size: number;
  mime: string;
  elapsed: number; // seconds
}

export interface Trim { start: number; end: number } // seconds

export interface Sample {
  url: string;
  size: number;
  seconds: number; // length of the test clip
  estimate: number; // extrapolated bytes for the whole (trimmed) output
  mime: string;
}

export type QueueStatus = "waiting" | "running" | "done" | "error";
export interface QueueItem {
  id: string;
  file: File;
  status: QueueStatus;
  progress: number;
  result?: Result;
  error?: string;
}
