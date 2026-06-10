import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ใช้ standalone output สำหรับ Docker deployment (ลดขนาด image)
  output: "standalone",
};

export default nextConfig;
