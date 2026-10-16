import type { MetadataRoute } from "next";

export const dynamic = "force-static";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** PWA manifest → "Add to Home screen" / "Install app" */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Framepress — Video Compressor",
    short_name: "Framepress",
    description: "Compress & convert video in your browser. No upload, no watermark. By Jittipat_Editz",
    start_url: `${BASE}/`,
    scope: `${BASE}/`,
    display: "standalone",
    background_color: "#08090a",
    theme_color: "#08090a",
    icons: [
      { src: `${BASE}/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${BASE}/icon-512.png`, sizes: "512x512", type: "image/png" },
      { src: `${BASE}/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
