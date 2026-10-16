"use client";
import { create } from "zustand";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { DEFAULT_CONTENT, DEFAULT_PRESETS, mergeContent, sanitizePresets, type PresetDoc, type SiteContent } from "./content";
import { getFirebase } from "./firebase";

interface SiteState {
  content: SiteContent;
  presets: PresetDoc[];
  source: "default" | "cache" | "firebase";
  /** Each Firestore doc has answered at least once (exists or not). */
  contentLoaded: boolean;
  presetsLoaded: boolean;
  /** Both docs answered → safe to take an editable copy (admin). */
  loaded: boolean;
  /** Something trustworthy is on screen (Firestore, or the last copy cached on this device) → public page may show. */
  ready: boolean;
  error: string | null;
}

export const useSite = create<SiteState>(() => ({
  content: DEFAULT_CONTENT,
  presets: DEFAULT_PRESETS,
  source: "default",
  contentLoaded: false,
  presetsLoaded: false,
  loaded: false,
  ready: false,
  error: null,
}));

/* ---------- per-device cache: makes repeat visits show the latest data instantly, no flicker ---------- */
const CACHE_KEY = "fp-site-cache-v1";

function readCache(): { content?: Partial<SiteContent>; presets?: unknown } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache() {
  const { content, presets, contentLoaded, presetsLoaded } = useSite.getState();
  if (!contentLoaded || !presetsLoaded) return; // never cache a half-loaded state
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ content, presets })); } catch {}
}

function settle() {
  const s = useSite.getState();
  const loaded = s.contentLoaded && s.presetsLoaded;
  if (loaded !== s.loaded || (loaded && !s.ready)) useSite.setState({ loaded, ready: s.ready || loaded });
  if (loaded) writeCache();
}

let unsub: (() => void) | null = null;

/** Live-subscribe to site/content + site/presets. Safe to call many times. */
export function subscribeSite() {
  if (unsub) return unsub;

  const cached = readCache();
  if (cached && !useSite.getState().loaded) {
    useSite.setState({
      content: mergeContent(cached.content),
      presets: cached.presets ? sanitizePresets(cached.presets) : DEFAULT_PRESETS,
      source: "cache",
      ready: true,
    });
  }

  const fb = getFirebase();
  if (!fb) {
    useSite.setState({ contentLoaded: true, presetsLoaded: true, loaded: true, ready: true });
    return () => {};
  }

  const onErr = (e: Error) => useSite.setState({ error: e.message, contentLoaded: true, presetsLoaded: true, loaded: true, ready: true });

  const u1 = onSnapshot(
    doc(fb.db, "site", "content"),
    (snap) => {
      useSite.setState({
        content: snap.exists() ? mergeContent(snap.data() as Partial<SiteContent>) : DEFAULT_CONTENT,
        contentLoaded: true,
        ...(snap.exists() ? { source: "firebase" as const } : {}),
      });
      settle();
    },
    onErr,
  );
  const u2 = onSnapshot(
    doc(fb.db, "site", "presets"),
    (snap) => {
      // A missing doc is an answer too ("use defaults") — the admin must not wait forever, nor copy stale data
      useSite.setState({
        presets: snap.exists() ? sanitizePresets(snap.data()?.items) : DEFAULT_PRESETS,
        presetsLoaded: true,
        ...(snap.exists() ? { source: "firebase" as const } : {}),
      });
      settle();
    },
    onErr,
  );

  // Public page: don't keep the page hidden for long on a slow first visit
  const tShow = setTimeout(() => { if (!useSite.getState().ready) useSite.setState({ ready: true }); }, 2500);
  // If Firestore can't be reached at all, stop waiting
  const tFail = setTimeout(() => {
    const s = useSite.getState();
    if (!s.loaded) useSite.setState({ error: "เชื่อมต่อ Firestore ไม่ได้ — กำลังแสดงข้อมูลล่าสุดที่มี", ready: true });
  }, 10000);

  unsub = () => { clearTimeout(tShow); clearTimeout(tFail); u1(); u2(); unsub = null; };
  return unsub;
}

/** Firestore keeps offline writes pending forever — fail loudly instead. */
function withTimeout<T>(p: Promise<T>, ms = 15000): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("หมดเวลา — เชื่อมต่อ Firestore ไม่ได้")), ms))]);
}

export async function saveContent(content: SiteContent, by: string) {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase ยังไม่ได้ตั้งค่า");
  await withTimeout(setDoc(doc(fb.db, "site", "content"), { ...content, updatedAt: serverTimestamp(), updatedBy: by }));
}

export async function savePresets(items: PresetDoc[], by: string) {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase ยังไม่ได้ตั้งค่า");
  // Strip undefined values — Firestore rejects them
  const clean = JSON.parse(JSON.stringify(items)) as PresetDoc[];
  await withTimeout(setDoc(doc(fb.db, "site", "presets"), { items: clean, updatedAt: serverTimestamp(), updatedBy: by }));
}
