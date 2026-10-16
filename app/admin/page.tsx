"use client";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { AlertTriangle, Check, ExternalLink, Eye, EyeOff, FileText, Layers, Loader2, LogIn, LogOut, RotateCcw, Save, ShieldCheck } from "lucide-react";
import Background from "@/components/Background";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/ThemeToggle";
import ContentEditor from "@/components/admin/ContentEditor";
import PresetEditor from "@/components/admin/PresetEditor";
import { ADMIN_EMAIL, ADMIN_USERNAME, firebaseConfigured, getFirebase, usernameToEmail } from "@/lib/firebase";
import { saveContent, savePresets, subscribeSite, useSite } from "@/lib/site";
import { DEFAULT_CONTENT, DEFAULT_PRESETS, type PresetDoc, type SiteContent } from "@/lib/content";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function authErrorTh(code: string): string {
  if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(code)) return "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
  if (/too-many-requests/.test(code)) return "ลองผิดหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่";
  if (/network/.test(code)) return "เชื่อมต่อ Firebase ไม่ได้ — ตรวจสอบอินเทอร์เน็ต";
  if (/operation-not-allowed/.test(code)) return "ยังไม่ได้เปิด Email/Password ใน Firebase Authentication";
  return `เข้าสู่ระบบไม่สำเร็จ (${code})`;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Background />
      <div className="mx-auto w-[min(1100px,calc(100%-24px))] pb-24">{children}</div>
    </>
  );
}

function NotConfigured() {
  return (
    <Shell>
      <div className="mx-auto mt-24 max-w-xl">
        <div className="panel p-7">
          <div className="flex items-center gap-3"><BrandMark /><h1 className="text-xl font-semibold">Admin ยังไม่พร้อมใช้งาน</h1></div>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            ยังไม่ได้ตั้งค่า Firebase — ใส่ค่า <code className="mono">NEXT_PUBLIC_FIREBASE_*</code> ในไฟล์ <code className="mono">.env.local</code> (ตอนรันบนเครื่อง)
            หรือใน GitHub → Settings → Secrets and variables → Actions → Variables (ตอน deploy) ตามขั้นตอนใน README
          </p>
          <a href={`${BASE}/`} className="btn btn-ghost btn-sm mt-6">← กลับหน้าเว็บ</a>
        </div>
      </div>
    </Shell>
  );
}

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fb = getFirebase();
    if (!fb) return;
    setBusy(true); setErr(null);
    try {
      await signInWithEmailAndPassword(fb.auth, usernameToEmail(username), password);
    } catch (e) {
      setErr(authErrorTh((e as { code?: string }).code ?? String(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <div className="flex min-h-screen items-center justify-center py-16">
        <form onSubmit={submit} className="panel corners w-full max-w-[400px] p-7 sm:p-8">
          <i className="c tl" /><i className="c tr" /><i className="c bl" /><i className="c br" />
          <div className="flex items-center justify-between">
            <div className="brand"><BrandMark /> Framepress</div>
            <ThemeToggle />
          </div>
          <div className="kicker mt-8">Admin</div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">เข้าสู่ระบบผู้ดูแล</h1>
          <p className="mt-2 text-sm text-muted">แก้ไขข้อความบนเว็บและพรีเซ็ตได้โดยไม่ต้องแก้โค้ด</p>

          <label className="mt-7 block">
            <span className="mb-1.5 block text-[.8rem] font-medium">ชื่อผู้ใช้</span>
            <input className="input" autoComplete="username" autoCapitalize="none" spellCheck={false} required
              value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
          </label>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-[.8rem] font-medium">รหัสผ่าน</span>
            <div className="relative">
              <input className="input !pr-11" type={show ? "text" : "password"} autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-muted hover:text-fg" aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          {err && <p role="alert" className="mt-4 flex gap-2 rounded-xl border border-err/40 bg-err/10 p-3 text-[.82rem] text-err"><AlertTriangle size={15} className="mt-0.5 shrink-0" /> {err}</p>}

          <button className="btn btn-primary btn-lg mt-6 w-full" disabled={busy || !username || !password}>
            {busy ? <Loader2 size={17} className="animate-spin" /> : <LogIn size={17} />} เข้าสู่ระบบ
          </button>
          <a href={`${BASE}/`} className="mt-5 block text-center text-[.8rem] text-muted hover:text-fg">← กลับหน้าเว็บ</a>
        </form>
      </div>
    </Shell>
  );
}

function Dashboard({ user }: { user: User }) {
  const site = useSite();
  const [tab, setTab] = useState<"content" | "presets">("content");
  const [content, setContent] = useState<SiteContent | null>(null);
  const [presets, setPresets] = useState<PresetDoc[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // `base*` = the server values our working copy started from. Dirty = working copy ≠ base,
  // so a late-arriving snapshot can never make stale data look "edited" (and get saved back).
  const [baseContent, setBaseContent] = useState<SiteContent | null>(null);
  const [basePresets, setBasePresets] = useState<PresetDoc[] | null>(null);
  const J = JSON.stringify;

  useEffect(() => subscribeSite(), []);

  // Take a working copy only after BOTH docs have answered from Firestore (not from cache/defaults)
  useEffect(() => {
    if (!site.loaded) return;
    if (content === null || (baseContent && J(content) === J(baseContent) && J(site.content) !== J(baseContent))) {
      // first load, or server changed while the admin hasn't touched this part → follow the server
      setContent(site.content); setBaseContent(site.content);
    }
    if (presets === null || (basePresets && J(presets) === J(basePresets) && J(site.presets) !== J(basePresets))) {
      setPresets(site.presets); setBasePresets(site.presets);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site.loaded, site.content, site.presets]);

  const dirtyContent = useMemo(() => content !== null && baseContent !== null && J(content) !== J(baseContent), [content, baseContent]);
  const dirtyPresets = useMemo(() => presets !== null && basePresets !== null && J(presets) !== J(basePresets), [presets, basePresets]);
  const dirty = dirtyContent || dirtyPresets;
  /** Someone else (another tab/device) saved after we started editing */
  const remoteChanged = (dirtyContent && J(site.content) !== J(baseContent)) || (dirtyPresets && J(site.presets) !== J(basePresets));

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const flash = (ok: boolean, msg: string) => { setToast({ ok, msg }); setTimeout(() => setToast(null), 3500); };

  const save = async () => {
    if (!content || !presets) return;
    const badPreset = presets.find((p) => !p.title.trim());
    if (badPreset) return flash(false, "มีพรีเซ็ตที่ยังไม่มีชื่อ");
    setSaving(true);
    try {
      const by = user.email ?? "admin";
      // Only write the part that was actually edited
      if (dirtyContent) await saveContent(content, by);
      if (dirtyPresets) await savePresets(presets, by);
      if (dirtyContent) setBaseContent(content);
      if (dirtyPresets) setBasePresets(presets);
      flash(true, "บันทึกแล้ว — หน้าเว็บอัปเดตทันที");
    } catch (e) {
      const m = (e as Error).message;
      flash(false, /permission/i.test(m) ? "ไม่มีสิทธิ์บันทึก — ตรวจสอบ Firestore Rules" : `บันทึกไม่สำเร็จ: ${m}`);
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setContent(site.content); setBaseContent(site.content);
    setPresets(site.presets); setBasePresets(site.presets);
  };
  const resetDefaults = () => {
    if (!confirm(tab === "content" ? "คืนค่าข้อความทั้งหมดเป็นค่าเริ่มต้น? (ยังไม่บันทึกจนกว่าจะกดบันทึก)" : "คืนค่าพรีเซ็ตทั้งหมดเป็นค่าเริ่มต้น? (ยังไม่บันทึกจนกว่าจะกดบันทึก)")) return;
    if (tab === "content") setContent(DEFAULT_CONTENT); else setPresets(DEFAULT_PRESETS);
  };

  return (
    <Shell>
      <header className="mt-4 flex items-center gap-3 rounded-[18px] border border-line bg-[var(--nav-bg)] p-2 pl-3.5 backdrop-blur-xl">
        <div className="brand"><BrandMark /> <span className="flex flex-col leading-tight">{site.content.siteName}<small>Admin</small></span></div>
        <div className="ml-auto flex items-center gap-2">
          <span className="tag hidden sm:inline-flex"><ShieldCheck size={12} /> {user.email?.split("@")[0]}</span>
          <a href={`${BASE}/`} target="_blank" rel="noopener" className="btn btn-ghost btn-sm"><ExternalLink size={14} /> <span className="hidden sm:inline">ดูหน้าเว็บ</span></a>
          <ThemeToggle />
          <button className="icon-btn" onClick={() => { if (!dirty || confirm("มีการแก้ไขที่ยังไม่บันทึก ออกจากระบบเลยไหม?")) signOut(getFirebase()!.auth); }} aria-label="ออกจากระบบ" title="ออกจากระบบ"><LogOut size={16} /></button>
        </div>
      </header>

      <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="kicker">Dashboard</div>
          <h1 className="sec-title mt-3">จัดการเว็บไซต์</h1>
          <p className="mt-2 text-sm text-muted">
            แหล่งข้อมูล: {site.source === "firebase" ? "Firestore (ออนไลน์)" : "ค่าเริ่มต้นในโค้ด — กดบันทึกครั้งแรกเพื่อสร้างข้อมูลใน Firestore"}
          </p>
        </div>
        <div className="seg">
          <button aria-selected={tab === "content"} onClick={() => setTab("content")}><FileText size={14} /> ข้อความเว็บ {dirtyContent && <i className="dot busy" />}</button>
          <button aria-selected={tab === "presets"} onClick={() => setTab("presets")}><Layers size={14} /> พรีเซ็ต {dirtyPresets && <i className="dot busy" />}</button>
        </div>
      </div>

      {site.error && <p className="mt-6 rounded-xl border border-err/40 bg-err/10 p-3 text-sm text-err">อ่านข้อมูลไม่สำเร็จ: {site.error}</p>}

      <div className="mt-6">
        {!content || !presets ? (
          <div className="panel-soft flex items-center gap-3 p-6 text-sm text-muted"><Loader2 size={16} className="animate-spin" /> กำลังโหลดข้อมูล…</div>
        ) : tab === "content" ? (
          <ContentEditor value={content} onChange={setContent} />
        ) : (
          <PresetEditor value={presets} onChange={setPresets} />
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button className="btn btn-ghost btn-sm" onClick={resetDefaults}><RotateCcw size={14} /> คืนค่าเริ่มต้น ({tab === "content" ? "ข้อความ" : "พรีเซ็ต"})</button>
      </div>

      {/* sticky save bar */}
      <div className={`fixed bottom-4 left-1/2 z-50 w-[min(720px,calc(100%-24px))] -translate-x-1/2 transition-all duration-300 ${dirty ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"}`}>
        <div className="panel flex items-center gap-3 p-3 pl-5">
          <i className="dot busy" />
          <span className="flex-1 text-sm">
            มีการแก้ไขที่ยังไม่บันทึก
            {remoteChanged && <span className="block text-[.74rem] text-warn">มีการบันทึกจากที่อื่นระหว่างนี้ — กดบันทึกจะใช้ข้อมูลของหน้านี้แทน</span>}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={discard} disabled={saving}>ยกเลิก</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} บันทึก
          </button>
        </div>
      </div>

      {toast && (
        <div role="status" className={`pop fixed left-1/2 top-5 z-[300] flex -translate-x-1/2 items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium ${toast.ok ? "bg-accent text-accent-ink" : "bg-err text-white"}`}>
          {toast.ok ? <Check size={16} /> : <AlertTriangle size={16} />} {toast.msg}
        </div>
      )}
    </Shell>
  );
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    document.title = "Admin — Framepress";
    const fb = getFirebase();
    if (!fb) { setUser(null); return; }
    return onAuthStateChanged(fb.auth, setUser);
  }, []);

  if (!firebaseConfigured) return <NotConfigured />;
  if (user === undefined) {
    return <Shell><div className="flex min-h-screen items-center justify-center text-muted"><Loader2 className="animate-spin" /></div></Shell>;
  }
  if (!user) return <Login />;
  if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return (
      <Shell>
        <div className="mx-auto mt-24 max-w-md panel p-7 text-center">
          <AlertTriangle className="mx-auto text-warn" />
          <p className="mt-3">บัญชีนี้ไม่มีสิทธิ์ผู้ดูแล (ต้องเป็น <b>{ADMIN_USERNAME}</b>)</p>
          <button className="btn btn-ghost btn-sm mt-5" onClick={() => signOut(getFirebase()!.auth)}>ออกจากระบบ</button>
        </div>
      </Shell>
    );
  }
  return <Dashboard user={user} />;
}
