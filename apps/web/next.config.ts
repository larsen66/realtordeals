import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  transpilePackages: ["@rieltordeals/domain"],
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
