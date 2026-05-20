import type { NextConfig } from 'next'
import withPWA from '@ducanh2912/next-pwa'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
    ],
  },
}

const withPWAConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: false,
  workboxOptions: {
    // Jangan cache API routes
    navigateFallbackDenylist: [/^\/(api|monitoring)/],
    runtimeCaching: [
      {
        urlPattern: /\/(api|monitoring)/,
        handler: 'NetworkOnly',
      },
    ],
  },
})(nextConfig)

export default withSentryConfig(withPWAConfig, {
  org: 'masbroo-studio',
  project: 'logis',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  sourcemaps: {
    disable: true,
  },
})