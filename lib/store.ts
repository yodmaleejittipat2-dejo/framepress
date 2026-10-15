import { create } from "zustand";
import { DEFAULT_SETTINGS } from "./presets";
import type { PresetDoc } from "./content";
import type { MediaMeta, Result, Settings, Status } from "./types";

interface State {
  status: Status;
  engine: { loaded: boolean; multiThread: boolean; source: string | null };
  file: File | null;
  sourceUrl: string | null;
  meta: MediaMeta | null;
  settings: Settings;
  progress: number; // 0–1
  eta: number | null; // seconds
  liveSize: number; // bytes written so far
  startedAt: number | null;
  logs: string[];
  command: string;
  result: Result | null;
  error: string | null;

  setStatus: (s: Status) => void;
  setEngine: (e: Partial<State["engine"]>) => void;
  setFile: (f: File | null) => void;
  setMeta: (m: MediaMeta | null) => void;
  patchSettings: (p: Partial<Settings>, keepPreset?: boolean) => void;
  applyPreset: (p: PresetDoc) => void;
  setProgress: (p: { progress?: number; eta?: number | null; liveSize?: number }) => void;
  pushLog: (line: string) => void;
  clearLogs: () => void;
  setCommand: (c: string) => void;
  setResult: (r: Result | null) => void;
  setError: (e: string | null) => void;
  startJob: () => void;
  resetAll: () => void;
}

const MAX_LOG = 1500;

export const useStore = create<State>((set, get) => ({
  status: "idle",
  engine: { loaded: false, multiThread: false, source: null },
  file: null,
  sourceUrl: null,
  meta: null,
  settings: DEFAULT_SETTINGS,
  progress: 0,
  eta: null,
  liveSize: 0,
  startedAt: null,
  logs: [],
  command: "",
  result: null,
  error: null,

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
    set({ progress: 0, eta: null, liveSize: 0, startedAt: Date.now(), error: null, status: "processing" });
  },
  resetAll: () => {
    const { sourceUrl, result } = get();
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    if (result) URL.revokeObjectURL(result.url);
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
    });
  },
}));
