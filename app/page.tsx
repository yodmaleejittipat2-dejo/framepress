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
import LogConsole from "@/components/LogConsole";
import Sections from "@/components/Sections";
import Footer from "@/components/Footer";
import SiteBoot from "@/components/SiteBoot";
import { useFFmpeg } from "@/hooks/useFFmpeg";
import { useStore } from "@/lib/store";
import { useSite } from "@/lib/site";

export default function Home() {
  const { preload, selectFile, run, cancel, reset } = useFFmpeg();
  const file = useStore((s) => s.file);
  const error = useStore((s) => s.error);
  const setError = useStore((s) => s.setError);
  const c = useSite((s) => s.content);

  useEffect(() => { document.title = `${c.siteName} — ${c.tagline}`; }, [c.siteName, c.tagline]);

  // Warm up the engine in the background so the first job starts faster
  useEffect(() => {
    const t = setTimeout(() => { if (!useStore.getState().engine.loaded) preload(); }, 1200);
    return () => clearTimeout(t);
  }, [preload]);

  // Drop a file anywhere on the page
  useEffect(() => {
    const over = (e: DragEvent) => e.preventDefault();
    const drop = (e: DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer?.files?.[0];
      if (f && useStore.getState().status !== "processing") selectFile(f);
    };
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => { window.removeEventListener("dragover", over); window.removeEventListener("drop", drop); };
  }, [selectFile]);

  return (
    <>
      <SiteBoot />
      <Background />
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
        <div className="grid items-start gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="min-w-0 space-y-4">
            {file ? <FileInfoCard onChange={reset} /> : <FileUploader onFile={selectFile} />}
            <ProgressCard onStart={run} onCancel={cancel} onReset={reset} />
            <LogConsole />
          </div>
          <SettingsPanel />
        </div>
      </section>

      <Sections />
      <Footer />

      {error && !file && (
        <div role="alert" className="pop fixed bottom-6 left-1/2 z-[300] flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-xl bg-inverse px-5 py-3 text-[.85rem] font-medium text-inverse-fg">
          <AlertTriangle size={16} /> {error}
          <button onClick={() => setError(null)} aria-label="ปิด"><X size={16} /></button>
        </div>
      )}
    </>
  );
}
