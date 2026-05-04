/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'xveytbcbmihdpcalnvii.supabase.co',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'bcryptjs'],
  },
}

module.exports = nextConfig
