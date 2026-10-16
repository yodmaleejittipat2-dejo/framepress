"use client";
import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import Background from "@/components/Background";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Filmstrip from "@/components/Filmstrip";
import FileUploader from "@/components/FileUploader";
import FileInfoCard from "@/components/FileInfoCard";
import SettingsPanel from "@/components/SettingsPanel";
import ProgressCard from "@/components/ProgressCard";
import QueueCard from "@/components/QueueCard";
import LogConsole from "@/components/LogConsole";
import BrowserCheck from "@/components/BrowserCheck";
import Sections from "@/components/Sections";
import Footer from "@/components/Footer";
import SiteBoot from "@/components/SiteBoot";
import { useFFmpeg } from "@/hooks/useFFmpeg";
import { useStore } from "@/lib/store";
import { useContent, useSite } from "@/lib/site";
import { useT } from "@/lib/i18n";

export default function Home() {
  const { preload, selectFiles, run, runSample, runQueue, cancel, reset } = useFFmpeg();
  const t = useT();
  const file = useStore((s) => s.file);
  const queueLen = useStore((s) => s.queue.length);
  const error = useStore((s) => s.error);
  const status = useStore((s) => s.status);
  const setError = useStore((s) => s.setError);
  const c = useContent();
  // Hide site text until real data (Firestore or this device's cache) is in → no flash of old/default values
  const ready = useSite((s) => s.ready);

  useEffect(() => { document.title = `${c.siteName} — ${c.tagline}`; }, [c.siteName, c.tagline]);

  // Warm up the engine in the background so the first job starts faster
  useEffect(() => {
    const tm = setTimeout(() => { if (!useStore.getState().engine.loaded) preload(); }, 1200);
    return () => clearTimeout(tm);
  }, [preload]);

  // Drop files anywhere on the page
  useEffect(() => {
    const over = (e: DragEvent) => e.preventDefault();
    const drop = (e: DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length && useStore.getState().status !== "processing") selectFiles(files);
    };
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => { window.removeEventListener("dragover", over); window.removeEventListener("drop", drop); };
  }, [selectFiles]);

  const batch = queueLen > 0;

  return (
    <>
      <SiteBoot />
      <Background />
      <div className={`transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`} aria-busy={!ready}>
        <Navbar />
        <Hero />
        <Filmstrip />

        <section id="compress" className="mx-auto w-[min(1240px,calc(100%-24px))] scroll-mt-24 pt-20">
          <div className="mb-10 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="kicker"><b>01</b> {c.workspaceEyebrow}</div>
              <h2 className="sec-title mt-4">{c.workspaceTitle}</h2>
            </div>
            <p className="max-w-sm text-sm text-muted lg:text-right">{c.workspaceSubtitle}</p>
          </div>
          <BrowserCheck />
          <div className="grid items-start gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="min-w-0 space-y-4">
              {batch ? (
                <QueueCard onAdd={selectFiles} onStart={runQueue} onStop={cancel} />
              ) : (
                <>
                  {file ? <FileInfoCard onChange={reset} /> : <FileUploader onFiles={selectFiles} />}
                  <ProgressCard onStart={run} onSample={runSample} onCancel={cancel} onReset={reset} />
                </>
              )}
              <LogConsole />
            </div>
            <SettingsPanel />
          </div>
        </section>

        <Sections />
        <Footer />
      </div>

      {error && (!file || batch) && status !== "error" && (
        <div role="alert" className="pop fixed bottom-6 left-1/2 z-[300] flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-xl bg-inverse px-5 py-3 text-[.85rem] font-medium text-inverse-fg">
          <AlertTriangle size={16} /> {error}
          <button onClick={() => setError(null)} aria-label={t("close")}><X size={16} /></button>
        </div>
      )}
    </>
  );
}
