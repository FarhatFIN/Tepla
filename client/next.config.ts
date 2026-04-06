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
};

export default nextConfig;
