import type { NextConfig } from "next";

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactCompiler: true,
  basePath,
  output: "standalone",
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  allowedDevOrigins: ["192.168.1.99", "192.168.1.*"],
};

export default nextConfig;