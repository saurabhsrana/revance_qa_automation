# FRAMEWORK.md — Loyalty Playwright Test (welcome + completeprofile)

## Scope

Two active UI suites (plain Playwright Test — no Cucumber / Gherkin):

| Spec | Pages | TMS |
|------|-------|-----|
| `tests/ui/welcome.spec.ts` | `WelcomePage`, `PhoneOtpFormComponent` | `TC-1` via `allure.tms` |
| `tests/ui/completeprofile.spec.ts` | `WelcomePage`, `SignupPage` | `TC-2` via `allure.tms` |

Shared: `BasePage`, `src/fixtures/loyalty.fixture.ts`, `src/config/*`, `src/utils/testData.ts`, `src/utils/logger.ts`.

Reserved: `tests/api/` + `docs/api-enrollment-endpoints-reference.md` for a future **verified** API enrollment rewrite (not populated yet).

## Reporting & test case tracking

End-to-end chain:

`allure.tms("N")` / tag `TC-N` on the test → `expect()` in `test.step` → Allure status / labels → optional `docs/traceability-matrix.md`

| Piece | Where |
|-------|--------|
| Test case labels | `tests/ui/*.spec.ts` (`allure.tms`, `allure.tags`) |
| Failure screenshot / video / trace | Playwright `use` + `allure-playwright` |
| Overview metadata (executor / env / categories) | `scripts/allure-prepare-metadata.js` + `allurerc.cjs` |
| Trend history (CI) | `reports/allure-history/history.jsonl` restored via Actions cache |
| Matrix | `npm run traceability:generate` → `docs/traceability-matrix.md` |

```bash
npm run test:loyalty
npm run allure:report
npm run traceability:generate
```

- `TEST_ENV` → `env.{dev|qa|prod}.ts` (`baseUrl`, `otp` for QA completeprofile)
- Optional overrides via `.env` (`BASE_URL`, `QA_TEST_OTP`)
- CI runs **chromium + firefox** only (WebKit excluded — Vercel bot checkpoint on QA). Opt-in locally: `npm run test:webkit` (`INCLUDE_WEBKIT=true`)
- Report UI: Allure 3 **`allure2`** plugin (classic Overview home) with `singleFile: true` — no deep-link away from Overview

## Commands

```bash
npm test
npm run test:welcome
npm run test:completeprofile
npm run test:loyalty
npm run test:pw:api          # no-op until tests/api has specs
npm run allure:report
```

## Contribution / Review Process

1. Branch from `main`, open a PR — do not push framework-breaking changes straight to `main` without review.
2. CI must run Playwright UI (`--project=ui`) and upload Allure artifacts.
3. Reviewers should check:
   - Job Summary / Allure report (pass/fail, attachments on failures)
   - Traceability (`docs/traceability-matrix.md` or Allure test-case labels/status for `TC-*`)
   - POM reuse under `src/pages/` (no duplicate page objects; no hardcoded waits)
4. Structural migrations (runner swap, deleting suites, changing secrets/CI contracts) require **explicit sign-off** before merge — a green pipeline alone is not enough.
