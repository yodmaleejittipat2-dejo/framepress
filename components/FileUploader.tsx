"use client";
import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { ACCEPT_ATTR, ACCEPTED_EXT } from "@/lib/presets";
import { useT } from "@/lib/i18n";
import Corners from "./Corners";

export default function FileUploader({ onFiles }: { onFiles: (f: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const t = useT();

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t("up.button")}
      className={`dropzone corners relative flex min-h-[360px] flex-col items-center justify-center gap-5 p-8 text-center ${drag ? "drag" : ""}`}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault(); e.stopPropagation(); setDrag(false);
        const files = Array.from(e.dataTransfer.files ?? []);
        if (files.length) onFiles(files);
      }}
    >
      <Corners />
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent text-accent-ink">
        <UploadCloud size={28} strokeWidth={1.8} />
      </div>
      <div>
        <h3 className="text-xl font-semibold tracking-tight">{drag ? t("up.titleDrag") : t("up.title")}</h3>
        <p className="mt-2 text-sm text-muted">{t("up.sub")}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {ACCEPTED_EXT.map((x) => <span key={x} className="tag">.{x}</span>)}
      </div>
      <span className="btn btn-inverse btn-sm">{t("up.button")}</span>
      <input ref={input} type="file" accept={ACCEPT_ATTR} multiple hidden
        onChange={(e) => { const f = Array.from(e.target.files ?? []); if (f.length) onFiles(f); e.target.value = ""; }} />
    </div>
  );
}
