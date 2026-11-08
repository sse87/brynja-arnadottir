import type { NextConfig } from 'next';

// Full config (images, security headers) arrives in Phases 5 and 8 — see docs/SPEC.md §3.3.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
