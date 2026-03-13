import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow importing from the shared package in the monorepo
  transpilePackages: ['@giaodich/shared'],

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  },

  // Image optimization – add domains here when needed
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
