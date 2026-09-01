const os = require('node:os');
const process = require('node:process');

const parallel = Number(process.env.PARALLEL_WORKERS || 4);
const retry = Number(process.env.CUCUMBER_RETRY ?? (process.env.CI ? 1 : 0));

/** GitHub Issues base URL (must end with /). Override with ALLURE_TMS_URL. */
const tmsUrl =
  process.env.ALLURE_TMS_URL ||
  'https://github.com/revance/PlaywrightAutomationAgent/issues/';

/** Loyalty suites only: welcome + complete profile. */
const LOYALTY_TAGS = '(@welcome or @completeprofile)';

/**
 * Allure auto-links `@TC-<n>` / `@ISSUE-<n>` Gherkin tags to GitHub Issues.
 * Zero per-step wiring — tag the Scenario once and the report shows a TMS link.
 */
const allureFormatOptions = {
  resultsDir: 'reports/allure-results',
  environmentInfo: {
    os_platform: os.platform(),
    os_release: os.release(),
    node_version: process.version,
    browser: process.env.BROWSER || 'chromium',
    test_env: process.env.TEST_ENV || 'dev',
  },
  links: {
    tms: {
      pattern: [/@TC-(\d+)/],
      urlTemplate: `${tmsUrl}%s`,
      nameTemplate: 'Test Case #%s',
    },
    issue: {
      pattern: [/@ISSUE-(\d+)/],
      urlTemplate: `${tmsUrl}%s`,
      nameTemplate: 'Issue #%s',
    },
  },
};

const common = {
  requireModule: ['ts-node/register'],
  require: ['src/hooks/world.ts', 'src/hooks/hooks.ts', 'src/steps/**/*.ts'],
  format: [
    'progress',
    'json:reports/cucumber.json',
    'allure-cucumberjs/reporter',
  ],
  formatOptions: allureFormatOptions,
  paths: ['features/**/*.feature'],
};

module.exports = {
  default: {
    ...common,
    parallel,
    retry,
    tags: `${LOYALTY_TAGS} and not @pending`,
  },
  smoke: {
    ...common,
    parallel,
    retry,
    tags: `@smoke and ${LOYALTY_TAGS} and not @pending`,
  },
  regression: {
    ...common,
    parallel,
    retry,
    tags: `@regression and ${LOYALTY_TAGS} and not @pending`,
  },
  debug: {
    ...common,
    parallel: 1,
    retry: 0,
    tags: `${LOYALTY_TAGS} and not @pending`,
  },
};
