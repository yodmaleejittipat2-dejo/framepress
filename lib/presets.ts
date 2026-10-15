import type { Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  presetId: null,
  container: "mp4",
  vcodec: "libx264",
  speed: "veryfast",
  rateMode: "crf",
  crf: 23,
  targetSizeMB: 8,
  fps: "source",
  resolution: "source",
  customW: "",
  customH: "",
  acodec: "aac",
  abitrate: "128k",
};

export const ACCEPTED_EXT = ["mp4", "mov", "mkv", "avi", "webm"];
export const ACCEPT_ATTR = ".mp4,.mov,.mkv,.avi,.webm,video/mp4,video/quicktime,video/x-matroska,video/x-msvideo,video/webm";
