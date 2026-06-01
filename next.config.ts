import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Next ignores an unrelated lockfile in the home dir.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
