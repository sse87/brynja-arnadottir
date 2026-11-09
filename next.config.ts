import type { NextConfig } from 'next';

// Security headers and `poweredByHeader` arrive in Phase 8 — see docs/SPEC.md §3.3.
const nextConfig: NextConfig = {
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
};

export default nextConfig;
