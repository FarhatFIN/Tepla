import type { NextConfig } from "next";

const gatewayUrl = process.env.API_GATEWAY_URL || "http://localhost:3000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/v2/:path*",
        destination: `${gatewayUrl}/api/v2/:path*`,
      },
    ];
  },
};

export default nextConfig;
