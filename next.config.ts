// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Allow bigger request bodies for uploads (default is 1mb)
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
