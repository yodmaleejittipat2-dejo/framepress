"use client";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

export function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-[.8rem] font-medium">{children}</span>
      {hint && <span className="text-[.7rem] text-muted">{hint}</span>}
    </div>
  );
}

export function TextField({ label, hint, value, onChange, placeholder }: { label: string; hint?: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <Label hint={hint}>{label}</Label>
      <input className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function AreaField({ label, hint, value, onChange, rows = 3 }: { label: string; hint?: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block">
      <Label hint={hint}>{label}</Label>
      <textarea className="textarea" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function Card({ title, desc, children, actions }: { title: string; desc?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="panel-soft p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {desc && <p className="mt-1 text-[.8rem] text-muted">{desc}</p>}
        </div>
        {actions}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function move<T>(arr: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const out = arr.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

export function RowActions({ i, n, onMove, onDelete }: { i: number; n: number; onMove: (d: number) => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 gap-1">
      <button type="button" className="icon-btn !h-8 !w-8" disabled={i === 0} onClick={() => onMove(-1)} aria-label="เลื่อนขึ้น"><ArrowUp size={14} /></button>
      <button type="button" className="icon-btn !h-8 !w-8" disabled={i === n - 1} onClick={() => onMove(1)} aria-label="เลื่อนลง"><ArrowDown size={14} /></button>
      <button type="button" className="icon-btn !h-8 !w-8 !text-err" onClick={onDelete} aria-label="ลบ"><Trash2 size={14} /></button>
    </div>
  );
}

/** Editable list of short strings (chips, marquee words). */
export function StringList({ label, hint, items, onChange, placeholder }: { label: string; hint?: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <div>
      <Label hint={hint}>{label}</Label>
      <div className="space-y-2">
        {items.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input className="input" value={v} placeholder={placeholder} onChange={(e) => onChange(items.map((x, k) => (k === i ? e.target.value : x)))} />
            <RowActions i={i} n={items.length} onMove={(d) => onChange(move(items, i, d))} onDelete={() => onChange(items.filter((_, k) => k !== i))} />
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([...items, ""])}><Plus size={14} /> เพิ่ม</button>
      </div>
    </div>
  );
}

/** Editable list of two-field objects (features, steps, FAQ). */
export function PairList<T extends { [K in keyof T]: string }>({ label, items, onChange, keys, labels, blank }: {
  label: string; items: T[]; onChange: (v: T[]) => void; keys: [keyof T, keyof T]; labels: [string, string]; blank: T;
}) {
  return (
    <div>
      <Label hint={`${items.length} รายการ`}>{label}</Label>
      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="cell space-y-2 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="step-n">{String(i + 1).padStart(2, "0")}</span>
              <RowActions i={i} n={items.length} onMove={(d) => onChange(move(items, i, d))} onDelete={() => onChange(items.filter((_, k) => k !== i))} />
            </div>
            <input className="input" placeholder={labels[0]} value={it[keys[0]]} onChange={(e) => onChange(items.map((x, k) => (k === i ? { ...x, [keys[0]]: e.target.value } : x)))} />
            <textarea className="textarea !min-h-[64px]" rows={2} placeholder={labels[1]} value={it[keys[1]]} onChange={(e) => onChange(items.map((x, k) => (k === i ? { ...x, [keys[1]]: e.target.value } : x)))} />
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([...items, { ...blank }])}><Plus size={14} /> เพิ่มรายการ</button>
      </div>
    </div>
  );
}

export function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="inline-flex items-center gap-2 text-[.8rem]">
      <span className="switch" aria-checked={checked} />
      {label}
    </button>
  );
}
