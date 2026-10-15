import type { Metadata, Viewport } from "next";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource/ibm-plex-sans-thai/300.css";
import "@fontsource/ibm-plex-sans-thai/400.css";
import "@fontsource/ibm-plex-sans-thai/500.css";
import "@fontsource/ibm-plex-sans-thai/600.css";
import "@fontsource/ibm-plex-sans-thai/700.css";
import "./globals.css";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const USE_COI = process.env.NEXT_PUBLIC_USE_COI === "1";

export const metadata: Metadata = {
  title: "Framepress — Video Compressor",
  description: "บีบอัดและแปลงไฟล์วิดีโอบนเบราว์เซอร์ ไม่อัปโหลด ไม่มีลายน้ำ • สร้างโดย Jittipat_Editz",
  authors: [{ name: "Jittipat_Editz" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08090a" },
    { media: "(prefers-color-scheme: light)", color: "#f1f0ea" },
  ],
};

// Runs before paint → no flash of the wrong theme. Dark is the default.
const themeScript = `try{var t=localStorage.getItem('fp-theme');document.documentElement.dataset.theme=(t==='light'||t==='dark')?t:'dark'}catch(e){document.documentElement.dataset.theme='dark'}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* GitHub Pages can't send COOP/COEP headers → this service worker adds them so multi-thread FFmpeg works */}
        {USE_COI && <script src={`${BASE}/coi-serviceworker.js`} />}
      </head>
      <body>{children}</body>
    </html>
  );
}
