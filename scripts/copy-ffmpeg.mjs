// Copies FFmpeg WASM core files into /public so they are served from your own domain
// (same-origin → works with COEP require-corp, no CDN dependency).
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const targets = [
  ["@ffmpeg/core/dist/esm", "public/ffmpeg/st", ["ffmpeg-core.js", "ffmpeg-core.wasm"]],
  ["@ffmpeg/core-mt/dist/esm", "public/ffmpeg/mt", ["ffmpeg-core.js", "ffmpeg-core.wasm", "ffmpeg-core.worker.js"]],
  // The FFmpeg class worker, served as a plain ES module (bypasses webpack, which breaks its dynamic import())
  ["@ffmpeg/ffmpeg/dist/esm", "public/ffmpeg/class", ["worker.js", "const.js", "errors.js"]],
  // Adds COOP/COEP via a service worker on hosts that can't set headers (GitHub Pages)
  ["coi-serviceworker", "public", ["coi-serviceworker.js"]],
];

for (const [pkg, out, files] of targets) {
  const src = join(root, "node_modules", pkg);
  if (!existsSync(src)) {
    console.warn(`[copy-ffmpeg] skip: ${pkg} not installed`);
    continue;
  }
  mkdirSync(join(root, out), { recursive: true });
  for (const f of files) cpSync(join(src, f), join(root, out, f));
  console.log(`[copy-ffmpeg] ${pkg} → ${out}`);
}
