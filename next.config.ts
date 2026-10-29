import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM + data files that must be loaded from node_modules at runtime.
  serverExternalPackages: ["@electric-sql/pglite"],
  images: { unoptimized: true },
  // Screenshots are capped at 4 MB (src/server/storage.ts); Vercel rejects request bodies over 4.5 MB.
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
};

export default nextConfig;
