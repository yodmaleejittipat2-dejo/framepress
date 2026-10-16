"use client";
import { useEffect } from "react";
import { subscribeSite } from "@/lib/site";
import { useLang } from "@/lib/i18n";

/** Starts the live Firestore subscription and picks the visitor's language. */
export default function SiteBoot() {
  useEffect(() => { useLang.getState().init(); }, []);
  useEffect(() => subscribeSite(), []);
  return null;
}
