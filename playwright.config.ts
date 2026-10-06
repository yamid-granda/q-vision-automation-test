import { defineConfig, devices } from '@playwright/test';

// Browser-level proxy: every request the browser makes goes through it. Off by
// default; set E2E_PROXY_SERVER to route the suite through a VPN/proxy when the
// site blocks the local IP, e.g. `E2E_PROXY_SERVER=socks5://127.0.0.1:1080 pnpm test`.
const proxy = process.env.E2E_PROXY_SERVER
  ? {
      server: process.env.E2E_PROXY_SERVER,
      username: process.env.E2E_PROXY_USERNAME,
      password: process.env.E2E_PROXY_PASSWORD,
      bypass: process.env.E2E_PROXY_BYPASS ?? 'localhost,127.0.0.1',
    }
  : undefined;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    proxy,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
