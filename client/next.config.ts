import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,

  async rewrites() {
    return [
      {
        source: "/api/v2/:path*",
        destination: "http://localhost:3000/api/v2/:path*",
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;