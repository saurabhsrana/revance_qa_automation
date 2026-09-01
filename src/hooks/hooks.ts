// Loads Allure's Cucumber runtime so `attachment()` from allure-js-commons is wired (not noop).
import 'allure-cucumberjs';
import {
  After,
  AfterStep,
  Before,
  BeforeAll,
  Status,
  setDefaultTimeout,
  type ITestCaseHookParameter,
} from '@cucumber/cucumber';
import { attachment, ContentType } from 'allure-js-commons';
import fs from 'node:fs';
import path from 'node:path';
import config from '../config';
import { launchBrowser, resolveBrowserName } from '../config/browser.factory';
import { ensureReportDirs } from '../pages/BasePage';
import { logger } from '../utils/logger';
import type { PlaywrightWorld } from './world';

setDefaultTimeout(120 * 1000);
ensureReportDirs();

BeforeAll(async function () {
  logger.info(`Cucumber BeforeAll — browser=${resolveBrowserName()}`);
});

Before(async function (this: PlaywrightWorld, { pickle }) {
  try {
    this.browser = await launchBrowser();
    this.context = await this.browser.newContext({
      recordVideo:
        process.env.CUCUMBER_VIDEO === 'true'
          ? { dir: 'test-results/cucumber-video' }
          : undefined,
    });
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(60_000);

    await this.context.tracing.start({ screenshots: true, snapshots: true, sources: true });

    // Prefer CI/local secrets; only fill gaps from config (do not clobber BASE_URL/OCE_BASE_URL).
    if (!process.env.BASE_URL?.trim()) {
      process.env.BASE_URL = config.baseUrl;
    }
    if (!process.env.OCE_BASE_URL?.trim()) {
      if ('oceBaseUrl' in config && typeof config.oceBaseUrl === 'string') {
        process.env.OCE_BASE_URL = config.oceBaseUrl;
      } else if ('headlessUrl' in config && typeof config.headlessUrl === 'string') {
        process.env.OCE_BASE_URL = config.headlessUrl;
      }
    }

    logger.info(
      `Scenario start: ${pickle?.name ?? 'unknown'} (headless=${String(
        process.env.HEADED === 'true' ? false : process.env.HEADLESS === 'true' || !!process.env.CI
      )})`
    );
  } catch (err) {
    logger.error(
      `Browser launch / Before hook failed for "${pickle?.name ?? 'unknown'}": ${
        err instanceof Error ? err.stack || err.message : String(err)
      }`
    );
    throw err;
  }
});

AfterStep(async function (this: PlaywrightWorld, { result }) {
  if (result?.status === Status.FAILED && this.page) {
    const buffer = await this.page.screenshot({ fullPage: true, type: 'png' });
    await attachment('Failure step screenshot', buffer, { contentType: ContentType.PNG });
  }
});

/**
 * Stop Playwright tracing and attach the .zip to Allure so the HTML report
 * offers a downloadable trace (open locally with `npx playwright show-trace`).
 */
async function attachFailureTrace(
  world: PlaywrightWorld,
  safeName: string,
  stamp: number
): Promise<void> {
  if (!world.context) return;

  const tracePath = path.resolve('reports/traces', `${safeName}-${stamp}.zip`);
  await world.context.tracing.stop({ path: tracePath }).catch((err) => {
    logger.warn(`[hooks] tracing.stop failed: ${String(err)}`);
  });

  if (!fs.existsSync(tracePath)) {
    logger.warn(`[hooks] trace file missing after stop: ${tracePath}`);
    return;
  }

  const bytes = fs.readFileSync(tracePath);
  await attachment('playwright-trace.zip', bytes, {
    contentType: 'application/zip',
    fileExtension: 'zip',
  });
  logger.error(`Failure trace attached to Allure (${bytes.length} bytes): ${tracePath}`);
}

After(async function (this: PlaywrightWorld, hookParams: ITestCaseHookParameter) {
  const failed = hookParams.result?.status === Status.FAILED;
  const safeName = (hookParams.pickle.name || 'scenario')
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 80);
  const stamp = Date.now();

  if (failed && this.page) {
    const message = hookParams.result?.message || 'Cucumber scenario failed';
    logger.error(`Scenario failed: ${hookParams.pickle.name} — ${message}`);

    const shotPath = path.resolve('reports/screenshots', `${safeName}-${stamp}.png`);
    await this.page.screenshot({ path: shotPath, fullPage: true }).catch(() => undefined);
    if (fs.existsSync(shotPath)) {
      await attachment('Failure screenshot', fs.readFileSync(shotPath), {
        contentType: ContentType.PNG,
      });
    }

    await attachFailureTrace(this, safeName, stamp);
  } else if (this.context) {
    await this.context.tracing.stop().catch(() => undefined);
    logger.info(`Scenario passed: ${hookParams.pickle.name}`);
  }

  await this.page?.close().catch(() => {});
  await this.context?.close().catch(() => {});
  await this.browser?.close().catch(() => {});
  this.page = undefined;
  this.context = undefined;
  this.browser = undefined;
});
