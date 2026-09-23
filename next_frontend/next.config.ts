import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  allowedDevOrigins: ["192.168.1.99", "192.168.1.*"],
};

export default nextConfig;