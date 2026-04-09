import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "storage.fespli.dev" },
      { protocol: "https", hostname: "maps.googleapis.com" },
    ],
  },
};

export default nextConfig;
