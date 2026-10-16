"use client";
import { create } from "zustand";
import {
  addDoc, collection, deleteDoc, doc, getDocs, increment, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc,
} from "firebase/firestore";
import {
  DEFAULT_CONTENT, DEFAULT_CONTENT_EN, DEFAULT_PRESETS, mergeContent, sanitizePresets, type PresetDoc, type SiteContent,
} from "./content";
import { getFirebase } from "./firebase";
import { useLang, type Lang } from "./i18n";

export interface Stats { files: number; bytesSaved: number }

interface SiteState {
  content: SiteContent; // Thai
  contentEn: SiteContent; // English
  presets: PresetDoc[];
  stats: Stats | null;
  source: "default" | "cache" | "firebase";
  /** Each Firestore doc has answered at least once (exists or not). */
  contentLoaded: boolean;
  contentEnLoaded: boolean;
  presetsLoaded: boolean;
  /** All docs answered → safe to take an editable copy (admin). */
  loaded: boolean;
  /** Something trustworthy is on screen → public page may show. */
  ready: boolean;
  error: string | null;
}

export const useSite = create<SiteState>(() => ({
  content: DEFAULT_CONTENT,
  contentEn: DEFAULT_CONTENT_EN,
  presets: DEFAULT_PRESETS,
  stats: null,
  source: "default",
  contentLoaded: false,
  contentEnLoaded: false,
  presetsLoaded: false,
  loaded: false,
  ready: false,
  error: null,
}));

/** Content in the visitor's language (EN falls back to TH for empty fields). */
export function useContent(): SiteContent {
  const lang = useLang((s) => s.lang);
  const th = useSite((s) => s.content);
  const en = useSite((s) => s.contentEn);
  return lang === "en" ? en : th;
}

export function presetLabel(p: PresetDoc, lang: Lang) {
  return lang === "en"
    ? { title: p.titleEn || p.title, subtitle: p.subtitleEn || p.subtitle, group: p.groupEn || p.group }
    : { title: p.title, subtitle: p.subtitle, group: p.group };
}

/* ---------- per-device cache: repeat visits show the latest data instantly ---------- */
const CACHE_KEY = "fp-site-cache-v2";

function readCache(): { content?: Partial<SiteContent>; contentEn?: Partial<SiteContent>; presets?: unknown } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function settle() {
  const s = useSite.getState();
  const loaded = s.contentLoaded && s.contentEnLoaded && s.presetsLoaded;
  if (loaded !== s.loaded || (loaded && !s.ready)) useSite.setState({ loaded, ready: s.ready || loaded });
  if (loaded) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ content: s.content, contentEn: s.contentEn, presets: s.presets })); } catch {}
  }
}

let unsub: (() => void) | null = null;

/** Live-subscribe to site content (TH + EN), presets and stats. Safe to call many times. */
export function subscribeSite() {
  if (unsub) return unsub;

  const cached = readCache();
  if (cached && !useSite.getState().loaded) {
    useSite.setState({
      content: mergeContent(cached.content),
      contentEn: mergeContent(cached.contentEn, DEFAULT_CONTENT_EN),
      presets: cached.presets ? sanitizePresets(cached.presets) : DEFAULT_PRESETS,
      source: "cache",
      ready: true,
    });
  }

  const fb = getFirebase();
  if (!fb) {
    useSite.setState({ contentLoaded: true, contentEnLoaded: true, presetsLoaded: true, loaded: true, ready: true });
    return () => {};
  }

  const onErr = (e: Error) =>
    useSite.setState({ error: e.message, contentLoaded: true, contentEnLoaded: true, presetsLoaded: true, loaded: true, ready: true });

  const u1 = onSnapshot(doc(fb.db, "site", "content"), (snap) => {
    useSite.setState({
      content: snap.exists() ? mergeContent(snap.data() as Partial<SiteContent>) : DEFAULT_CONTENT,
      contentLoaded: true,
      ...(snap.exists() ? { source: "firebase" as const } : {}),
    });
    settle();
  }, onErr);
  const u2 = onSnapshot(doc(fb.db, "site", "content_en"), (snap) => {
    useSite.setState({
      contentEn: snap.exists() ? mergeContent(snap.data() as Partial<SiteContent>, DEFAULT_CONTENT_EN) : DEFAULT_CONTENT_EN,
      contentEnLoaded: true,
    });
    settle();
  }, onErr);
  const u3 = onSnapshot(doc(fb.db, "site", "presets"), (snap) => {
    // A missing doc is an answer too ("use defaults") — never wait forever or copy stale data
    useSite.setState({
      presets: snap.exists() ? sanitizePresets(snap.data()?.items) : DEFAULT_PRESETS,
      presetsLoaded: true,
      ...(snap.exists() ? { source: "firebase" as const } : {}),
    });
    settle();
  }, onErr);
  const u4 = onSnapshot(doc(fb.db, "stats", "global"), (snap) => {
    const d = snap.data();
    useSite.setState({ stats: d ? { files: Number(d.files) || 0, bytesSaved: Number(d.bytesSaved) || 0 } : { files: 0, bytesSaved: 0 } });
  }, () => {});

  const tShow = setTimeout(() => { if (!useSite.getState().ready) useSite.setState({ ready: true }); }, 2500);
  const tFail = setTimeout(() => {
    if (!useSite.getState().loaded) useSite.setState({ error: "เชื่อมต่อ Firestore ไม่ได้ — กำลังแสดงข้อมูลล่าสุดที่มี", ready: true });
  }, 10000);

  unsub = () => { clearTimeout(tShow); clearTimeout(tFail); u1(); u2(); u3(); u4(); unsub = null; };
  return unsub;
}

/* ---------------- writes ---------------- */

/** Firestore keeps offline writes pending forever — fail loudly instead. */
function withTimeout<T>(p: Promise<T>, ms = 15000): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("หมดเวลา — เชื่อมต่อ Firestore ไม่ได้")), ms))]);
}
const clean = <T,>(v: T): T => JSON.parse(JSON.stringify(v)); // strips undefined (Firestore rejects it)

export type HistoryType = "content" | "content_en" | "presets";
export interface HistoryEntry { id: string; type: HistoryType; savedAt: number; by: string; data: unknown }
const HISTORY_KEEP = 30;

async function writeHistory(type: HistoryType, data: unknown, by: string) {
  const fb = getFirebase();
  if (!fb) return;
  try {
    await withTimeout(addDoc(collection(fb.db, "history"), { type, data: clean(data), by, savedAt: Date.now() }));
    // keep only the newest N versions
    const snap = await getDocs(query(collection(fb.db, "history"), orderBy("savedAt", "desc"), limit(HISTORY_KEEP + 20)));
    await Promise.all(snap.docs.slice(HISTORY_KEEP).map((d) => deleteDoc(d.ref)));
  } catch {
    /* history is best-effort — never block a save */
  }
}

export async function saveContent(content: SiteContent, by: string, lang: Lang = "th") {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase ยังไม่ได้ตั้งค่า");
  const id = lang === "en" ? "content_en" : "content";
  await withTimeout(setDoc(doc(fb.db, "site", id), { ...clean(content), updatedAt: serverTimestamp(), updatedBy: by }));
  await writeHistory(id, content, by);
}

export async function savePresets(items: PresetDoc[], by: string) {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase ยังไม่ได้ตั้งค่า");
  await withTimeout(setDoc(doc(fb.db, "site", "presets"), { items: clean(items), updatedAt: serverTimestamp(), updatedBy: by }));
  await writeHistory("presets", items, by);
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  const fb = getFirebase();
  if (!fb) return [];
  const snap = await withTimeout(getDocs(query(collection(fb.db, "history"), orderBy("savedAt", "desc"), limit(HISTORY_KEEP))));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<HistoryEntry, "id">) }));
}

/** Public counter: +1 file and the bytes saved. Best-effort, never throws. */
export async function recordJob(bytesSaved: number) {
  const fb = getFirebase();
  if (!fb) return;
  try {
    await withTimeout(
      setDoc(doc(fb.db, "stats", "global"), { files: increment(1), bytesSaved: increment(Math.max(0, Math.round(bytesSaved))) }, { merge: true }),
      8000,
    );
  } catch { /* ignore */ }
}
