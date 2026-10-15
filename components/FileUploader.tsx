"use client";
import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { ACCEPT_ATTR, ACCEPTED_EXT } from "@/lib/presets";
import Corners from "./Corners";

export default function FileUploader({ onFile }: { onFile: (f: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="เลือกไฟล์วิดีโอ"
      className={`dropzone corners relative flex min-h-[360px] flex-col items-center justify-center gap-5 p-8 text-center ${drag ? "drag" : ""}`}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault(); e.stopPropagation(); setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
    >
      <Corners />
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent text-accent-ink">
        <UploadCloud size={28} strokeWidth={1.8} />
      </div>
      <div>
        <h3 className="text-xl font-semibold tracking-tight">{drag ? "ปล่อยไฟล์ได้เลย" : "ลากวิดีโอมาวางตรงนี้"}</h3>
        <p className="mt-2 text-sm text-muted">หรือคลิกเพื่อเลือกไฟล์ — ไฟล์จะไม่ออกจากเครื่องคุณ</p>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {ACCEPTED_EXT.map((x) => <span key={x} className="tag">.{x}</span>)}
      </div>
      <span className="btn btn-inverse btn-sm">เลือกไฟล์</span>
      <input ref={input} type="file" accept={ACCEPT_ATTR} hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </div>
  );
}
