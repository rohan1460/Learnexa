import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js from bundling pdf-parse and pdfjs-dist which messes up the worker path
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
