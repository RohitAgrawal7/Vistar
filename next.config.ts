import type { NextConfig } from "next";

/**
 * Optional: point café `/api` at a separate kitchen deploy.
 * Leave unset so the in-app `src/app/api` routes handle the kitchen (Vercel-friendly).
 */
const externalBackend = process.env.BACKEND_ORIGIN?.trim().replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    if (!externalBackend) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${externalBackend}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
