import {defineConfig, devices} from '@playwright/test'

/**
 * Device/browser matrix. Everything below runs in Playwright's engines:
 * desktop projects use real Chromium / WebKit / Firefox builds; the phone and tablet
 * projects are EMULATION (viewport, DPR, touch, UA) — not real devices.
 * Findings that only reproduce under emulation are labelled as such in the report.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  fullyParallel: false,
  workers: 2,
  retries: 0,
  reporter: [['list'], ['html', {open: 'never'}], ['json', {outputFile: 'test-results/results.json'}]],
  globalSetup: './tests/helpers/global-setup.ts',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {name: 'desktop-chrome', use: {...devices['Desktop Chrome']}},
    {name: 'desktop-safari-webkit', use: {...devices['Desktop Safari']}},
    {name: 'desktop-firefox', use: {...devices['Desktop Firefox']}},
    {name: 'iphone-14-emulated', use: {...devices['iPhone 14']}},
    {name: 'pixel-7-emulated', use: {...devices['Pixel 7']}},
    {name: 'ipad-emulated', use: {...devices['iPad (gen 7)']}},
  ],
})
