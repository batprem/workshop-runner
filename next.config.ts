import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page is per-user and polls live data, so static/partial caching is disabled.
  cacheComponents: false,
};

export default nextConfig;
