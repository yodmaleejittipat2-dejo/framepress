"use client";
import { useEffect, useMemo, useRef } from "react";
import { AlertTriangle, CheckCircle2, Info, Paperclip, Wand2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useLang, useT } from "@/lib/i18n";
import { COMMAND_EXAMPLES, parseCommand } from "@/lib/command";
import { extOf, formatBytes, formatDuration } from "@/lib/format";

export default function CommandEditor() {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const text = useStore((s) => s.customCommand);
  const setText = useStore((s) => s.setCustomCommand);
  const file = useStore((s) => s.file);
  const meta = useStore((s) => s.meta);
  const extras = useStore((s) => s.extraFiles);
  const setExtras = useStore((s) => s.setExtraFiles);
  const locked = useStore((s) => s.status === "processing");
  const attach = useRef<HTMLInputElement>(null);

  // restore the last command typed on this device
  useEffect(() => {
    if (useStore.getState().customCommand) return;
    let saved: string | null = null;
    try { saved = localStorage.getItem("fp-custom-cmd"); } catch {}
    useStore.setState({ customCommand: saved || COMMAND_EXAMPLES[0].cmd });
  }, []);

  const parsed = useMemo(
    () => (text.trim()
      ? parseCommand(text, `input.${file ? extOf(file.name) || "mp4" : "mp4"}`, meta?.duration ?? null, undefined, extras.map((f) => f.name))
      : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, file, meta?.duration, extras, lang],
  );

  const addExtras = (list: File[]) => {
    const byName = new Map(extras.map((f) => [f.name.toLowerCase(), f]));
    list.forEach((f) => byName.set(f.name.toLowerCase(), f)); // same name replaces the old one
    setExtras([...byName.values()]);
  };

  return (
    <fieldset disabled={locked} className={`space-y-4 ${locked ? "pointer-events-none opacity-50" : ""}`}>
      <div>
        <div className="field-label"><span>FFmpeg command</span><span className="normal-case tracking-normal">{t("cmd.label")}</span></div>
        <textarea
          className="textarea mono !min-h-[150px] !text-[.78rem] !leading-relaxed"
          spellCheck={false} autoCapitalize="off" autoCorrect="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="ffmpeg -i input.mp4 -c:v libx264 -crf 23 output.mp4"
          aria-label={t("st.cmd")}
        />
      </div>

      <div>
        <div className="field-label"><span>{t("cmd.examples")}</span></div>
        <div className="opt-row">
          {COMMAND_EXAMPLES.map((ex) => (
            <button key={ex.cmd} type="button" className="opt" aria-pressed={text === ex.cmd} onClick={() => setText(ex.cmd)}>
              <Wand2 size={12} className="mr-1 inline" />{lang === "en" ? ex.en : ex.th}
            </button>
          ))}
        </div>
      </div>

      {/* extra inputs */}
      <div>
        <div className="field-label"><span>{t("cmd.extra")}</span></div>
        <div className="cell space-y-2 p-3">
          {extras.map((f) => (
            <div key={f.name} className="flex items-center gap-2 text-[.8rem]">
              <Paperclip size={13} className="shrink-0 text-muted" />
              <code className="mono min-w-0 flex-1 truncate">{f.name}</code>
              <span className="mono text-[.7rem] text-muted">{formatBytes(f.size)}</span>
              <button type="button" className="icon-btn !h-7 !w-7" aria-label={`remove ${f.name}`} onClick={() => setExtras(extras.filter((x) => x !== f))}><X size={13} /></button>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[.72rem] text-muted">{t("cmd.extraHint")}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => attach.current?.click()}><Paperclip size={13} /> {t("cmd.addExtra")}</button>
          </div>
          <input ref={attach} type="file" multiple hidden onChange={(e) => { addExtras(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
        </div>
      </div>

      {parsed && (
        <div className={`rounded-xl border p-3.5 text-[.78rem] leading-relaxed ${parsed.ok ? "border-line bg-surface" : "border-err/40 bg-err/10"}`}>
          {parsed.ok ? (
            <>
              <p className="flex items-center gap-2 font-semibold"><CheckCircle2 size={15} className="text-accent-text" /> {t("cmd.ready")}</p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 mono text-[.72rem]">
                <dt className="text-muted">INPUT</dt><dd className="truncate">{file ? file.name : t("cmd.pickFirst")}</dd>
                {extras.length > 0 && (<><dt className="text-muted">+FILES</dt><dd className="truncate">{extras.map((f) => f.name).join(", ")}</dd></>)}
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
        <li>• {t("cmd.tip1")}</li>
        <li>• {t("cmd.tip2")}</li>
        <li>• {t("cmd.tip3")}</li>
      </ul>
    </fieldset>
  );
}
