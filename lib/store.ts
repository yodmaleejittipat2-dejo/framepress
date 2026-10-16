import { create } from "zustand";
import { DEFAULT_SETTINGS } from "./presets";
import type { PresetDoc } from "./content";
import type { MediaMeta, QueueItem, Result, Sample, Settings, Status, Trim } from "./types";

interface State {
  status: Status;
  engine: { loaded: boolean; multiThread: boolean; source: string | null };
  file: File | null;
  sourceUrl: string | null;
  meta: MediaMeta | null;
  settings: Settings;
  /** "preset" = Settings UI builds the command, "command" = user pastes their own ffmpeg line */
  mode: "preset" | "command";
  customCommand: string;
  /** Seconds of output expected for the current job (progress %) */
  jobDuration: number | null;
  progress: number; // 0–1
  eta: number | null; // seconds
  liveSize: number; // bytes written so far
  startedAt: number | null;
  logs: string[];
  command: string;
  result: Result | null;
  error: string | null;
  /** Single-file trim range (null = whole clip) */
  trim: Trim | null;
  /** Result of the "test 5 seconds" encode */
  sample: Sample | null;
  sampling: boolean;
  /** Batch mode: more than one file */
  queue: QueueItem[];
  queueRunning: boolean;
  /** Extra inputs for command mode (logo.png, music.mp3 …) */
  extraFiles: File[];

  setStatus: (s: Status) => void;
  setEngine: (e: Partial<State["engine"]>) => void;
  setFile: (f: File | null) => void;
  setMeta: (m: MediaMeta | null) => void;
  patchSettings: (p: Partial<Settings>, keepPreset?: boolean) => void;
  applyPreset: (p: PresetDoc) => void;
  setMode: (m: "preset" | "command") => void;
  setCustomCommand: (c: string) => void;
  setJobDuration: (d: number | null) => void;
  setProgress: (p: { progress?: number; eta?: number | null; liveSize?: number }) => void;
  pushLog: (line: string) => void;
  clearLogs: () => void;
  setCommand: (c: string) => void;
  setResult: (r: Result | null) => void;
  setError: (e: string | null) => void;
  startJob: () => void;
  resetAll: () => void;
  setTrim: (t: Trim | null) => void;
  setSample: (s: Sample | null) => void;
  addToQueue: (files: File[]) => void;
  updateQueueItem: (id: string, patch: Partial<QueueItem>) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  setExtraFiles: (f: File[]) => void;
}

const MAX_LOG = 1500;

export const useStore = create<State>((set, get) => ({
  status: "idle",
  engine: { loaded: false, multiThread: false, source: null },
  file: null,
  sourceUrl: null,
  meta: null,
  settings: DEFAULT_SETTINGS,
  mode: "preset",
  customCommand: "",
  jobDuration: null,
  progress: 0,
  eta: null,
  liveSize: 0,
  startedAt: null,
  logs: [],
  command: "",
  result: null,
  error: null,
  trim: null,
  sample: null,
  sampling: false,
  queue: [],
  queueRunning: false,
  extraFiles: [],

  setStatus: (status) => set({ status }),
  setEngine: (e) => set({ engine: { ...get().engine, ...e } }),
  setFile: (file) => {
    const prev = get().sourceUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ file, sourceUrl: file ? URL.createObjectURL(file) : null });
  },
  setMeta: (meta) => set({ meta }),
  patchSettings: (p, keepPreset = false) =>
    set({ settings: { ...get().settings, ...p, ...(keepPreset ? {} : { presetId: null }) } }),
  setMode: (mode) => set({ mode }),
  setCustomCommand: (customCommand) => {
    try { localStorage.setItem("fp-custom-cmd", customCommand); } catch {}
    set({ customCommand });
  },
  setJobDuration: (jobDuration) => set({ jobDuration }),
  applyPreset: (p) => set({ settings: { ...DEFAULT_SETTINGS, ...p.settings, presetId: p.id } }),
  setProgress: (p) => set(p as Partial<State>),
  pushLog: (line) => {
    const logs = get().logs;
    const next = logs.length >= MAX_LOG ? logs.slice(-MAX_LOG + 200) : logs.slice();
    next.push(line);
    set({ logs: next });
  },
  clearLogs: () => set({ logs: [] }),
  setCommand: (command) => set({ command }),
  setResult: (result) => {
    const prev = get().result;
    if (prev && prev.url !== result?.url) URL.revokeObjectURL(prev.url);
    set({ result });
  },
  setError: (error) => set({ error }),
  startJob: () => {
    get().setResult(null);
    set({ progress: 0, eta: null, liveSize: 0, jobDuration: null, startedAt: Date.now(), error: null, status: "processing" });
  },
  setTrim: (trim) => { get().setSample(null); set({ trim }); },
  setSample: (sample) => {
    const prev = get().sample;
    if (prev && prev.url !== sample?.url) URL.revokeObjectURL(prev.url);
    set({ sample });
  },
  addToQueue: (files) => {
    const items: QueueItem[] = files.map((file) => ({ id: Math.random().toString(36).slice(2, 10), file, status: "waiting", progress: 0 }));
    set({ queue: [...get().queue, ...items] });
  },
  updateQueueItem: (id, patch) => set({ queue: get().queue.map((q) => (q.id === id ? { ...q, ...patch } : q)) }),
  removeFromQueue: (id) => {
    const it = get().queue.find((q) => q.id === id);
    if (it?.result) URL.revokeObjectURL(it.result.url);
    set({ queue: get().queue.filter((q) => q.id !== id) });
  },
  clearQueue: () => {
    get().queue.forEach((q) => q.result && URL.revokeObjectURL(q.result.url));
    set({ queue: [], queueRunning: false });
  },
  setExtraFiles: (extraFiles) => set({ extraFiles }),
  resetAll: () => {
    const { sourceUrl, result } = get();
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    if (result) URL.revokeObjectURL(result.url);
    get().setSample(null);
    set({
      status: get().engine.loaded ? "idle" : "idle",
      file: null,
      sourceUrl: null,
      meta: null,
      progress: 0,
      eta: null,
      liveSize: 0,
      startedAt: null,
      command: "",
      result: null,
      error: null,
      trim: null,
    });
  },
}));
