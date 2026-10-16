"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, Copy, Check, Smartphone, X } from "lucide-react";
import { useT } from "@/lib/i18n";

type Issue = "unsupported" | "inapp" | "ios" | null;

function detect(): Issue {
  const ua = navigator.userAgent;
  // Hard requirements for ffmpeg.wasm
  const hasWasm = typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function";
  let moduleWorker = false;
  try {
    // feature-detect module workers without starting one
    new Worker("data:,", { get type() { moduleWorker = true; return "module" as const; } }).terminate();
  } catch { /* old browser */ }
  if (!hasWasm || typeof Worker === "undefined" || !moduleWorker || typeof BigInt === "undefined") return "unsupported";
  // In-app browsers (Facebook, Instagram, LINE, TikTok, Messenger, Android WebView) often kill heavy WASM work
  if (/FBAN|FBAV|FB_IAB|Instagram|Line\/|Messenger|TikTok|musical_ly|BytedanceWebview|; wv\)/i.test(ua)) return "inapp";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  return null;
}

/** Warns when the browser can't (or might not) run the compressor. */
export default function BrowserCheck() {
  const t = useT();
  const [issue, setIssue] = useState<Issue>(null);
  const [hidden, setHidden] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setIssue(detect()); }, []);
  if (!issue || hidden) return null;

  const tone = issue === "ios" ? "border-line bg-surface text-fg" : issue === "inapp" ? "border-warn/50 bg-warn/10 text-warn" : "border-err/50 bg-err/10 text-err";
  return (
    <div role="alert" className={`pop mb-4 flex flex-wrap items-center gap-3 rounded-2xl border p-4 text-sm ${tone}`}>
      {issue === "ios" ? <Smartphone size={18} className="shrink-0" /> : <AlertTriangle size={18} className="shrink-0" />}
      <span className="min-w-0 flex-1">{issue === "unsupported" ? t("bc.unsupported") : issue === "inapp" ? t("bc.inapp") : t("bc.ios")}</span>
      {issue === "inapp" && (
        <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard?.writeText(location.href); setCopied(true); }}>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? t("bc.copied") : t("bc.copy")}
        </button>
      )}
      {issue !== "unsupported" && <button className="icon-btn !h-8 !w-8" onClick={() => setHidden(true)} aria-label={t("close")}><X size={14} /></button>}
    </div>
  );
}
