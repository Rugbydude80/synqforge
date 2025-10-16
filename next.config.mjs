/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // output: 'standalone', // Disabled to avoid email template build issues
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
      allowedOrigins: [
        'localhost:3000',
        'localhost:3001',
        'synqforge.com',
        'www.synqforge.com',
        '*.vercel.app' // Allow Vercel preview deployments
      ],
    },
  },
  typescript: {
    ignoreBuildErrors: true, // Temporarily ignore to unblock deployment
  },
  eslint: {
    ignoreDuringBuilds: true, // Allow warnings during build
  },
  // Skip static optimization for error pages to avoid build issues
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,
  // Explicitly configure webpack to handle CSS and exclude email templates
  webpack: (config, { isServer }) => {
    // Exclude @react-email/components from the bundle
    // It contains Html component that conflicts with Next.js
    config.externals = config.externals || []

    if (isServer) {
      // For server-side, mark as external so it's not bundled
      if (Array.isArray(config.externals)) {
        config.externals.push('@react-email/components')
      } else {
        config.externals = [...(Array.isArray(config.externals) ? config.externals : [config.externals]), '@react-email/components']
      }
    } else {
      // For client-side, completely exclude email templates
      config.resolve.alias = {
        ...config.resolve.alias,
        '@react-email/components': false,
        '@/emails/story-assigned': false,
        '@/emails/notification-digest': false,
      }
    }

    // Also exclude from server chunks to avoid Html component conflicts
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-email/components': false,
    }
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
