import { chromium, firefox, webkit, type Browser, type BrowserType } from '@playwright/test';

export type SupportedBrowser = 'chromium' | 'firefox' | 'webkit';

/**
 * Resolve browser name from BROWSER env (default chromium).
 */
export function resolveBrowserName(): SupportedBrowser {
  const raw = (process.env.BROWSER || 'chromium').toLowerCase().trim();
  if (raw === 'firefox' || raw === 'webkit' || raw === 'chromium') return raw;
  throw new Error(`Unsupported BROWSER="${raw}". Use chromium | firefox | webkit.`);
}

function browserType(name: SupportedBrowser): BrowserType {
  switch (name) {
    case 'firefox':
      return firefox;
    case 'webkit':
      return webkit;
    default:
      return chromium;
  }
}

/** Headed locally by default; headless when HEADLESS=true or CI (unless HEADED=true). */
export function shouldRunHeadless(): boolean {
  if (process.env.HEADED === 'true') return false;
  if (process.env.HEADLESS === 'true') return true;
  return !!process.env.CI;
}

/**
 * Launch Chromium, Firefox, or WebKit for Cucumber workers.
 */
export async function launchBrowser(
  name: SupportedBrowser = resolveBrowserName()
): Promise<Browser> {
  return browserType(name).launch({
    headless: shouldRunHeadless(),
    slowMo: process.env.SLOW_MO ? Number(process.env.SLOW_MO) : undefined,
  });
}
