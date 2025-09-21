import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['images.unsplash.com'], // whitelist the domain
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
