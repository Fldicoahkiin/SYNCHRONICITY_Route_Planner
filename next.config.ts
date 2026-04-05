import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "storage.fespli.dev" },
    ],
  },
};

export default nextConfig;
