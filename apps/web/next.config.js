/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@giaodich/shared'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  },
  images: {
    remotePatterns: [],
  },
};

module.exports = nextConfig;
