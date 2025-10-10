/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
      allowedOrigins: ['localhost:3000', 'localhost:3001'],
    },
  },
  typescript: {
    ignoreBuildErrors: false, // Keep strict in development
  },
  eslint: {
    ignoreDuringBuilds: true, // Allow warnings during build
  },
  // Skip static optimization for error pages to avoid NextAuth compatibility issues
  skipMiddlewareUrlNormalize: true,
  // Explicitly configure webpack to handle CSS
  webpack: (config) => {
    return config
  },
  // Security headers for production
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
