"use client";
import { useEffect, useRef, useState } from "react";
import { Download, History, Loader2, RotateCcw, Upload } from "lucide-react";
import { loadHistory, type HistoryEntry, type HistoryType } from "@/lib/site";
import { Card } from "./fields";

const TYPE_LABEL: Record<HistoryType, string> = { content: "ข้อความ (ไทย)", content_en: "ข้อความ (English)", presets: "พรีเซ็ต" };

function summary(e: HistoryEntry): string {
  if (e.type === "presets" && Array.isArray(e.data)) return `${e.data.length} พรีเซ็ต: ${(e.data as { title?: string }[]).slice(0, 3).map((p) => p.title).join(", ")}${e.data.length > 3 ? "…" : ""}`;
  const d = e.data as { heroTitle?: string; announcement?: string };
  return [d?.heroTitle, d?.announcement && `ประกาศ: ${d.announcement}`].filter(Boolean).join(" · ");
}

export default function HistoryPanel({ onRestore, onExport, onImport, refreshKey }: {
  onRestore: (e: HistoryEntry) => void;
  onExport: () => void;
  onImport: (json: unknown) => void;
  refreshKey: number;
}) {
  const [items, setItems] = useState<HistoryEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setItems(null);
    loadHistory().then(setItems).catch((e) => { setErr((e as Error).message); setItems([]); });
  }, [refreshKey]);

  return (
    <div className="space-y-4">
      <Card title="สำรอง & กู้คืนด้วยไฟล์" desc="ดาวน์โหลดข้อมูลทั้งหมด (ข้อความไทย/อังกฤษ + พรีเซ็ต) เป็นไฟล์ JSON เก็บไว้ หรือนำเข้าไฟล์เดิมกลับมา">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-inverse btn-sm" onClick={onExport}><Download size={14} /> Export JSON</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => file.current?.click()}><Upload size={14} /> Import JSON</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try { onImport(JSON.parse(await f.text())); } catch { alert("ไฟล์ JSON ไม่ถูกต้อง"); }
          }} />
        </div>
        <p className="text-[.76rem] text-muted">นำเข้าแล้วข้อมูลจะยังไม่ถูกใช้จริงจนกว่าจะกด “บันทึก”</p>
      </Card>

      <Card title="ประวัติการบันทึก" desc="ทุกครั้งที่กดบันทึก ระบบเก็บเวอร์ชันไว้ 30 ครั้งล่าสุด — กด “ย้อนกลับ” เพื่อโหลดเวอร์ชันนั้นมาแก้ต่อ แล้วกดบันทึก">
        {items === null ? (
          <p className="flex items-center gap-2 text-sm text-muted"><Loader2 size={14} className="animate-spin" /> กำลังโหลด…</p>
        ) : err ? (
          <p className="text-sm text-err">โหลดประวัติไม่สำเร็จ: {err} — ตรวจสอบว่าอัปเดต Firestore Rules แล้ว</p>
        ) : items.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted"><History size={14} /> ยังไม่มีประวัติ — จะเริ่มเก็บตั้งแต่การบันทึกครั้งถัดไป</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            {items.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="tag">{TYPE_LABEL[e.type] ?? e.type}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{new Date(e.savedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}</div>
                  <div className="truncate text-[.74rem] text-muted">{summary(e)} · โดย {String(e.by).split("@")[0]}</div>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onRestore(e)}><RotateCcw size={13} /> ย้อนกลับ</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
