/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['storage.googleapis.com'],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['*']
    }
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig 