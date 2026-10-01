import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Next ignores an unrelated lockfile in the home dir.
  turbopack: {
    root: __dirname,
  },
  // Dev only: let phones/tablets on the LAN load dev assets (Next blocks
  // non-localhost origins by default, which leaves pages without JS).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
};

export default nextConfig;
