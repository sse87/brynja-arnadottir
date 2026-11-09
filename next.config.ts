import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

// Static generation rules out nonces, so scripts need 'unsafe-inline' (SPEC §3.3 CSP note).
// All images go through /_next/image and fonts are self-hosted, so 'self' covers them.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Tailwind v4 under Turbopack (create-next-app 16.4 default; replaces postcss.config.mjs).
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Whole pull zone: current masters sit at the root; target layout is /v1/archive/… (SPEC §3.3).
      { protocol: 'https', hostname: 'brynja.b-cdn.net', pathname: '/**' },
    ],
    deviceSizes: [640, 828, 1080, 1280, 1600, 1920, 2560],
    imageSizes: [128, 256, 384, 480],
    qualities: [70, 75, 90], // Next 16 rejects any `quality` prop not listed here
    minimumCacheTTL: 60 * 60 * 24 * 31, // 31 days; masters are immutable (versioned URLs)
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      {
        source: '/press/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
