/**
 * Two deploy modes:
 *  - GitHub Pages (GITHUB_PAGES=true): static export to /out, served under /<repo-name>.
 *    Pages can't send headers, so public/coi-serviceworker.js adds COOP/COEP in the browser.
 *  - Vercel / `next start`: normal server, headers below enable multi-thread FFmpeg.
 */
const isPages = process.env.GITHUB_PAGES === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const isolationHeaders = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath,
  ...(isPages
    ? { output: "export", trailingSlash: true, images: { unoptimized: true } }
    : {
        async headers() {
          return [
            { source: "/:path*", headers: isolationHeaders },
            { source: "/ffmpeg/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
          ];
        },
      }),
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false, crypto: false };
    return config;
  },
};

export default nextConfig;
