# Loyalty Playwright automation (welcome + complete profile)

Playwright Test for Revance Loyalty. Reporting is **Allure only**. Test cases link to **GitHub Issues** via `allure.tms` / `TC-*` tags.

## Suites

| Spec | Tags / TMS | Command |
|------|------------|---------|
| Welcome / phone OTP | `TC-1` | `npm run test:welcome` |
| Complete profile | `TC-2` | `npm run test:completeprofile` |
| Both (UI project) | | `npm run test:loyalty` or `npm test` |

API enrollment specs are reserved under `tests/api/` (see `docs/api-enrollment-endpoints-reference.md`).

## Setup

```bash
cp .env.example .env
npm ci
npx playwright install
```

## Allure + GitHub TMS

```bash
npm test
npm run allure:report
npm run traceability:generate
npm run ci:summary
```

PowerShell tip: prefer single `npm run …` scripts (no `&&`). Example: `npm run allure:report` runs generate then open.

- Tag each test with `allure.tags(..., "TC-<n>")` and `allure.tms("<n>", ...)`
- On failure, Allure includes screenshot + downloadable Playwright trace zip

## Layout

```
tests/ui/      welcome.spec.ts, completeprofile.spec.ts
tests/api/     reserved (README only until contract-verified rewrite)
src/page-objects/  WelcomePage, SignupPage, BasePage, PhoneOtpFormComponent
src/fixtures/  loyalty.fixture.ts (welcomePage, signupPage, loyaltyState)
src/config/    env.*, oceAuth, browser.factory
src/data/      constants.json (static test data)
src/utils/     testData.ts (dynamic helpers), logger.ts
docs/          FRAMEWORK.md, api-enrollment-endpoints-reference.md
scripts/       ci-job-summary.js, generate-traceability.js, allure-clean.js
playwright.config.ts
allurerc.cjs
```

## CI (GitHub Actions)

Workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

### What runs when

| Event | Lint & typecheck | Playwright E2E + Allure | GitHub Pages |
|-------|------------------|-------------------------|--------------|
| Push to `main` / `master` | Yes | Yes (full matrix) | Yes (after combine) |
| Pull request (no label) | Yes | **Skipped** (neutral) | No |
| Pull request + `ready-for-e2e` label | Yes | Yes | No (artifact + PR comment only) |
| Manual **Run workflow** | Yes | Yes | Only if run on main |

E2E hits a **shared QA environment**, so PR runs are gated behind the **`ready-for-e2e`** label to avoid colliding on shared test data.

**How to run E2E on a PR:** open the PR → right sidebar **Labels** → add `ready-for-e2e` (create the label once if it doesn’t exist). No need to use the Actions tab. Pushing new commits while the label is still present re-runs E2E automatically. Remove the label to skip E2E on later updates.

### Pipeline steps (when E2E runs)

1. **Lint & typecheck** — ESLint, TypeScript, Prettier
2. **Playwright UI** — chromium / webkit / firefox matrix
3. **Reports** — Combine Allure, Job Summary, artifacts (14-day retention)
4. **Pages** — Allure publish on main push only (`always()` so failed tests still deploy the report)

### One-time setup (repo secrets)

In GitHub: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Example | Used for |
|--------|---------|----------|
| `BASE_URL` | `https://…vercel.app` | Loyalty app under test (optional; QA default in `env.qa.ts`) |
| `SIGNUP_OTP` | `112233` | OTP in completeprofile flow |
| `VERCEL_PROTECTION_BYPASS` | _(from Vercel project settings)_ | Bypasses Vercel "We're verifying your browser" in CI |

If QA shows **"We're verifying your browser"**, add `VERCEL_PROTECTION_BYPASS` from Vercel → **Settings → Deployment Protection → Protection Bypass for Automation**.

### Manual run

**Actions → CI → Run workflow** (uses `workflow_dispatch`). Optional checkbox: **enable_video** for failure videos.

### Reading results

- **Playwright UI job → Summary** — pass/fail table, failure messages, secret presence
- **Artifacts** — download `allure-report-combined` / per-browser artifacts; open `index.html`
- **publish-allure job → Summary** — GitHub Pages URL when Pages is configured (main only)
- **Traces** — from the artifact / Allure attachment, run `npx playwright show-trace <file.zip>`
