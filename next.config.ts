import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
  // Vercelでのパフォーマンス最適化
  serverExternalPackages: ['@prisma/client', 'prisma'],
};

export default nextConfig;

