import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/mobile-browser-rendering.spec.js',
  projects: [
    { name: 'chrome-pixel', use: { ...devices['Pixel 7'], channel: 'chrome' } },
    { name: 'edge-pixel', use: { ...devices['Pixel 7'], channel: 'msedge' } },
    { name: 'chrome-iphone', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
    { name: 'edge-iphone', use: { ...devices['iPhone 13'], browserName: 'webkit' } }
  ],
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: true
  }
});
