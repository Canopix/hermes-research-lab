import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  generateBuildId: () => 'build',
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
}

export default nextConfig