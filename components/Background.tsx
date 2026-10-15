"use client";
import { useEffect } from "react";

/** Dot grid + tinted orbs + cursor glow + card spotlight. */
export default function Background() {
  useEffect(() => {
    const glow = document.getElementById("glow");
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (glow) { glow.style.left = `${e.clientX}px`; glow.style.top = `${e.clientY}px`; }
        const el = (e.target as HTMLElement)?.closest?.(".spot") as HTMLElement | null;
        if (el) {
          const r = el.getBoundingClientRect();
          el.style.setProperty("--mx", `${e.clientX - r.left}px`);
          el.style.setProperty("--my", `${e.clientY - r.top}px`);
        }
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return (
    <>
      <div className="ambient" aria-hidden><div className="orb orb-a" /><div className="orb orb-b" /></div>
      <div id="glow" aria-hidden />
    </>
  );
}
