/** @type {import('next').NextConfig} */
const rawBackendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3001';
const backendUrl = rawBackendUrl
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
