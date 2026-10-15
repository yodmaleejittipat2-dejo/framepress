"use client";
import { useEffect } from "react";
import { subscribeSite } from "@/lib/site";

/** Starts the live Firestore subscription for site content + presets. */
export default function SiteBoot() {
  useEffect(() => subscribeSite(), []);
  return null;
}
