"use client";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";

/**
 * Firebase web config — these values are public by design (security comes from Firestore Rules).
 * Set them as NEXT_PUBLIC_FIREBASE_* env vars (.env.local locally, GitHub repo Variables for deploy).
 */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

/** Admin "username" → Firebase Auth email: jittipat_admin → jittipat_admin@framepress.app */
export const ADMIN_USERNAME = process.env.NEXT_PUBLIC_ADMIN_USERNAME || "jittipat_admin";
export const ADMIN_EMAIL_DOMAIN = process.env.NEXT_PUBLIC_ADMIN_EMAIL_DOMAIN || "framepress.app";
export const usernameToEmail = (u: string) => (u.includes("@") ? u.trim() : `${u.trim().toLowerCase()}@${ADMIN_EMAIL_DOMAIN}`);
export const ADMIN_EMAIL = usernameToEmail(ADMIN_USERNAME);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function getFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } | null {
  if (!firebaseConfigured || typeof window === "undefined") return null;
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
    if (process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "1") {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
    }
  }
  return { app: app!, auth: auth!, db: db! };
}
