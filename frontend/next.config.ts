import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  generateBuildId: () => "build",
};

export default nextConfig;