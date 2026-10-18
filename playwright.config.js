import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: true,
  use: {
    baseURL: `http://127.0.0.1:${process.env.TEST_DIST ? 4174 : 4173}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: process.env.TEST_DIST ? "npm run preview" : "npm start",
    url: `http://127.0.0.1:${process.env.TEST_DIST ? 4174 : 4173}`,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: "firefox",
      use: {
        browserName: "firefox",
        channel: undefined,
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: "webkit",
      use: {
        browserName: "webkit",
        channel: undefined,
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.CI ? {} : { channel: "chrome" }),
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "tablet",
      use: {
        ...devices["iPad Mini"],
        ...(process.env.CI ? {} : { channel: "chrome" }),
        defaultBrowserType: "chromium",
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone SE"],
        ...(process.env.CI ? {} : { channel: "chrome" }),
        defaultBrowserType: "chromium",
        viewport: { width: 375, height: 667 },
      },
    },
    {
      name: "small",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.CI ? {} : { channel: "chrome" }),
        viewport: { width: 320, height: 740 },
      },
    },
  ],
});
