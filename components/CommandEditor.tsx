"use client";
import { useEffect, useMemo } from "react";
import { AlertTriangle, CheckCircle2, Info, Wand2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { COMMAND_EXAMPLES, parseCommand } from "@/lib/command";
import { extOf } from "@/lib/format";
import { formatDuration } from "@/lib/format";

export default function CommandEditor() {
  const text = useStore((s) => s.customCommand);
  const setText = useStore((s) => s.setCustomCommand);
  const file = useStore((s) => s.file);
  const meta = useStore((s) => s.meta);
  const locked = useStore((s) => s.status === "processing");

  // restore the last command typed on this device
  useEffect(() => {
    if (useStore.getState().customCommand) return;
    try {
      const saved = localStorage.getItem("fp-custom-cmd");
      useStore.setState({ customCommand: saved || COMMAND_EXAMPLES[0].cmd });
    } catch {
      useStore.setState({ customCommand: COMMAND_EXAMPLES[0].cmd });
    }
  }, []);

  const parsed = useMemo(
    () => (text.trim() ? parseCommand(text, `input.${file ? extOf(file.name) || "mp4" : "mp4"}`, meta?.duration ?? null) : null),
    [text, file, meta?.duration],
  );

  return (
    <fieldset disabled={locked} className={`space-y-4 ${locked ? "pointer-events-none opacity-50" : ""}`}>
      <div>
        <div className="field-label"><span>FFmpeg command</span><span className="normal-case tracking-normal">วางคำสั่งแล้วกดรัน</span></div>
        <textarea
          className="textarea mono !min-h-[150px] !text-[.78rem] !leading-relaxed"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="ffmpeg -i input.mp4 -c:v libx264 -crf 23 output.mp4"
          aria-label="คำสั่ง FFmpeg"
        />
      </div>

      <div>
        <div className="field-label"><span>ตัวอย่างคำสั่ง</span></div>
        <div className="opt-row">
          {COMMAND_EXAMPLES.map((ex) => (
            <button key={ex.label} type="button" className="opt" aria-pressed={text === ex.cmd} onClick={() => setText(ex.cmd)}>
              <Wand2 size={12} className="mr-1 inline" />{ex.label}
            </button>
          ))}
        </div>
      </div>

      {parsed && (
        <div className={`rounded-xl border p-3.5 text-[.78rem] leading-relaxed ${parsed.ok ? "border-line bg-surface" : "border-err/40 bg-err/10"}`}>
          {parsed.ok ? (
            <>
              <p className="flex items-center gap-2 font-semibold"><CheckCircle2 size={15} className="text-accent-text" /> คำสั่งพร้อมรัน</p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 mono text-[.72rem]">
                <dt className="text-muted">INPUT</dt><dd className="truncate">{file ? file.name : "— เลือกไฟล์ก่อน —"}</dd>
                <dt className="text-muted">OUTPUT</dt><dd className="truncate">{parsed.displayName}</dd>
                {parsed.expectedDuration != null && (<><dt className="text-muted">LENGTH</dt><dd>≈ {formatDuration(parsed.expectedDuration)}</dd></>)}
              </dl>
              {parsed.notes.length > 0 && (
                <ul className="mt-2.5 space-y-1 text-warn">
                  {parsed.notes.map((n) => <li key={n} className="flex gap-1.5"><Info size={13} className="mt-0.5 shrink-0" /> {n}</li>)}
                </ul>
              )}
            </>
          ) : (
            <ul className="space-y-1 text-err">
              {parsed.errors.map((e) => <li key={e} className="flex gap-1.5"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> {e}</li>)}
            </ul>
          )}
        </div>
      )}

      <ul className="space-y-1.5 text-[.74rem] leading-relaxed text-muted">
        <li>• ชื่อไฟล์หลัง <code className="mono text-fg">-i</code> จะเป็นอะไรก็ได้ ระบบใช้ไฟล์ที่คุณอัปโหลดแทนเสมอ</li>
        <li>• ชื่อไฟล์ท้ายคำสั่งคือชื่อไฟล์ที่ได้ดาวน์โหลด (.mp4 .mov .mkv .webm .gif .mp3 .m4a .wav .jpg …)</li>
        <li>• รองรับ 1 input และ 1 output ต่อคำสั่ง · FFmpeg 5.1 (WebAssembly) · H.264, H.265, VP8, AAC, MP3, Opus</li>
      </ul>
    </fieldset>
  );
}
