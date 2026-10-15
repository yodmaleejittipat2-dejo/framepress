"use client";
import { useSite } from "@/lib/site";

export default function Filmstrip() {
  const items = useSite((s) => s.content.marquee);
  if (!items.length) return null;
  const row = [...items, ...items, ...items];
  return (
    <div className="mt-20 overflow-hidden py-4">
      <div className="filmstrip" aria-hidden>
        <div className="track">{[...row, ...row].map((t, i) => <span key={i}>{t}</span>)}</div>
      </div>
    </div>
  );
}
