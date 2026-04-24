import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Proxy API requests to the gateway in development
  async rewrites() {
    return [
      {
        source: "/api/v2/:path*",
        destination: "http://localhost:3000/api/v2/:path*",
      },
    ];
  },

  distDir: ".next-app",

  typescript: {
    // We run `tsc --noEmit` explicitly in the workspace check pipeline.
    ignoreBuildErrors: true,
  },

  turbopack: {
    root: path.resolve(clientDir, ".."),
  },
};
