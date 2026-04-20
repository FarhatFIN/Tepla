import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const clientDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: ".next-app",
  typescript: {
    // We run `tsc --noEmit` explicitly in the workspace check pipeline.
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: path.resolve(clientDir, ".."),
  },
};

export default nextConfig;
