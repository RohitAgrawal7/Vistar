import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
