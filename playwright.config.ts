import os from "node:os";
import { defineConfig, devices } from "@playwright/test";
import config from "./src/config";
import {
  buildBrowserContextOptions,
  shouldRunHeadless,
} from "./src/config/browser.factory";

const tmsUrl =
  process.env.ALLURE_TMS_URL ||
  "https://github.com/saurabhsrana/revance_qa_automation/issues/";

const uiTestDir = "./tests/ui";

/**
 * Playwright Test runner — UI specs under tests/ui (chromium/firefox/webkit);
 * API folder reserved (empty).
 */
export default defineConfig({
  timeout: 180_000,
  expect: { timeout: 60_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.PARALLEL_WORKERS
    ? Number(process.env.PARALLEL_WORKERS)
    : 1,
  outputDir: "test-results",
  reporter: [
    ["list"],
    [
      "allure-playwright",
      {
        resultsDir: "reports/allure-results",
        detail: true,
        suiteTitle: false,
        links: {
          tms: {
            urlTemplate: `${tmsUrl}%s`,
            nameTemplate: "Test Case #%s",
          },
          issue: {
            urlTemplate: `${tmsUrl}%s`,
            nameTemplate: "Issue #%s",
          },
        },
        environmentInfo: {
          os_platform: os.platform(),
          os_release: os.release(),
          node_version: process.version,
          browser: process.env.BROWSER || "chromium",
          test_env: process.env.TEST_ENV || "dev",
        },
      },
    ],
  ],
  use: {
    baseURL: config.baseUrl,
    headless: shouldRunHeadless(),
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 60_000,
    navigationTimeout: 60_000,
    ...buildBrowserContextOptions(),
  },
  projects: [
    {
      name: "chromium",
      testDir: uiTestDir,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      testDir: uiTestDir,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      testDir: uiTestDir,
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "api",
      testDir: "./tests/api",
      // Request-only suites — no browser device.
    },
  ],
});
