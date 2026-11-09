import { defineConfig, devices } from '@playwright/test';

const PORT = 3210;

/**
 * E2E runs against the production build: `pnpm build && pnpm test:e2e` (SPEC Appendix D).
 * Kept out of `pnpm test` so the per-phase gate stays fast.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}/is`,
    // Never reuse: a stale `next start` would silently serve an old build.
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
