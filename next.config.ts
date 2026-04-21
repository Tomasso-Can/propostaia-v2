import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuração mínima e estável para Vercel + Tailwind
  reactStrictMode: true,

  // Desativa Turbopack temporariamente para evitar conflitos
  experimental: {
    optimizeCss: true,
  },
};

export default nextConfig;
