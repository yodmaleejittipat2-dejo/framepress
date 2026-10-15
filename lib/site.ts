"use client";
import { create } from "zustand";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { DEFAULT_CONTENT, DEFAULT_PRESETS, mergeContent, sanitizePresets, type PresetDoc, type SiteContent } from "./content";
import { getFirebase } from "./firebase";

interface SiteState {
  content: SiteContent;
  presets: PresetDoc[];
  source: "default" | "firebase";
  loaded: boolean;
  error: string | null;
}

export const useSite = create<SiteState>(() => ({
  content: DEFAULT_CONTENT,
  presets: DEFAULT_PRESETS,
  source: "default",
  loaded: false,
  error: null,
}));

let unsub: (() => void) | null = null;

/** Live-subscribe to site/content + site/presets. Safe to call many times. */
export function subscribeSite() {
  if (unsub) return unsub;
  const fb = getFirebase();
  if (!fb) {
    useSite.setState({ loaded: true });
    return () => {};
  }
  const onErr = (e: Error) => useSite.setState({ error: e.message, loaded: true });
  const u1 = onSnapshot(
    doc(fb.db, "site", "content"),
    (snap) => useSite.setState({ content: mergeContent(snap.data() as Partial<SiteContent>), source: snap.exists() ? "firebase" : useSite.getState().source, loaded: true }),
    onErr,
  );
  const u2 = onSnapshot(
    doc(fb.db, "site", "presets"),
    (snap) => {
      if (snap.exists()) useSite.setState({ presets: sanitizePresets(snap.data()?.items), source: "firebase" });
    },
    onErr,
  );
  // If Firestore can't be reached, don't leave the UI waiting forever
  const t = setTimeout(() => {
    if (!useSite.getState().loaded) useSite.setState({ loaded: true, error: "เชื่อมต่อ Firestore ไม่ได้ — กำลังแสดงค่าเริ่มต้น" });
  }, 8000);
  unsub = () => { clearTimeout(t); u1(); u2(); unsub = null; };
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
  await withTimeout(setDoc(doc(fb.db, "site", "presets"), { items, updatedAt: serverTimestamp(), updatedBy: by }));
}
