# Loyalty Cucumber automation (welcome + complete profile)

Cucumber + Playwright for Revance Loyalty. Reporting is **Allure only**. Test cases link to **GitHub Issues** via `@TC-*` tags.

## Suites

| Feature | Tags | Command |
|---------|------|---------|
| Welcome / phone OTP | `@welcome` `@TC-1` | `npm run test:welcome` |
| Complete profile | `@completeprofile` `@TC-2` | `npm run test:completeprofile` |
| Both | | `npm run test:loyalty` |

## Setup

```bash
cp .env.example .env
npm ci
npx playwright install
```

## Allure + GitHub TMS (§15.2)

```bash
npm test
npm run allure:report
npm run traceability:generate
npm run ci:summary
```

PowerShell tip: prefer single `npm run …` scripts (no `&&`). Example: `npm run allure:report` runs generate then open.

- Tag each scenario `@TC-<github-issue-number>`
- Comment `Then` steps with `// TC-<n> — …` next to `expect(...)`
- On failure, Allure includes screenshot + downloadable `playwright-trace.zip`

## Layout

```
features/welcome.feature
features/completeprofile.feature
src/pages/     WelcomePage, SignupPage, BasePage, PhoneOtpFormComponent
src/steps/     welcome.steps, signup.steps
src/hooks/     World + Before/After
src/config/    env.*, oceAuth, browser.factory
scripts/ci-job-summary.js
```

## CI (GitHub Actions)

Workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

### What runs on every push / PR

1. **Lint & typecheck** — ESLint, TypeScript, Prettier
2. **Cucumber smoke** — `@smoke` scenarios on **chromium, firefox, webkit** (parallel jobs)
3. **Reports** — Allure generate, traceability matrix, Job Summary with `@TC-*` links
4. **Artifacts** — Allure HTML, traces, screenshots (14-day retention)

### One-time setup (repo secrets)

In GitHub: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Example | Used for |
|--------|---------|----------|
| `BASE_URL` | `https://…vercel.app` | Loyalty app under test |
| `SIGNUP_OTP` | `112233` | OTP in completeprofile flow |
| `VERCEL_PROTECTION_BYPASS` | _(from Vercel project settings)_ | Bypasses Vercel "We're verifying your browser" in CI |

If QA shows **"We're verifying your browser"**, add `VERCEL_PROTECTION_BYPASS` from Vercel → **Settings → Deployment Protection → Protection Bypass for Automation**.

### Manual run

**Actions → CI → Run workflow** (uses `workflow_dispatch`).

### Reading results

- **Cucumber job → Summary** — pass/fail table, failure error messages, inline screenshots
- **Artifacts** — download `cucumber-chromium-artifacts` (etc.); open `reports/allure-report/index.html` locally
- **publish-allure job → Summary** — clickable **GitHub Pages** URL for the Allure report (enable **Settings → Pages → Source: GitHub Actions** once)
- **Traces** — from the artifact zip, run `npx playwright show-trace reports/traces/<file>.zip`
