"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, Terminal, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";

export default function LogConsole() {
  const logs = useStore((s) => s.logs);
  const command = useStore((s) => s.command);
  const clear = useStore((s) => s.clearLogs);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open && box.current) box.current.scrollTop = box.current.scrollHeight; }, [logs, open]);

  const shown = logs.slice(-400);
  const cls = (l: string) => (l.startsWith("$ ") ? "cmd" : l.startsWith("[warn]") ? "warn" : l.startsWith("[engine]") || l.startsWith("[probe]") ? "eng" : "");

  return (
    <div className="panel-soft overflow-hidden">
      <button className="flex w-full items-center gap-3 px-5 py-4 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="grid h-9 w-9 place-items-center rounded-[10px] border border-line bg-surface-2"><Terminal size={16} /></span>
        <span className="flex-1">
          <b className="block text-sm font-semibold">Log Console</b>
          <span className="block text-[.74rem] text-muted">ดูคำสั่ง FFmpeg CLI ที่ทำงานอยู่จริง · <span className="mono">{logs.length}</span> บรรทัด</span>
        </span>
        <ChevronDown size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="pop space-y-3 px-5 pb-5">
          {command && (
            <div className="console flex items-start gap-3 p-3.5">
              <code className="cmd flex-1 break-all">{command}</code>
              <button className="btn btn-ghost btn-sm !px-2.5 !text-white" title="คัดลอกคำสั่ง"
                onClick={() => { navigator.clipboard?.writeText(command); setCopied(true); setTimeout(() => setCopied(false), 1400); }}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          )}
          <div ref={box} className="console h-64 overflow-auto p-3.5">
            {shown.length === 0 ? <span className="opacity-40">ยังไม่มี log — เลือกไฟล์เพื่อเริ่ม</span>
              : shown.map((l, i) => <div key={i} className={`whitespace-pre-wrap break-all ${cls(l)}`}>{l}</div>)}
          </div>
          <div className="flex justify-end">
            <button className="btn btn-ghost btn-sm" onClick={clear}><Trash2 size={13} /> ล้าง log</button>
          </div>
        </div>
      )}
    </div>
  );
}
