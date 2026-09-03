# FRAMEWORK.md — Loyalty Playwright Test (welcome + completeprofile)

## Scope

Two active UI suites (plain Playwright Test — no Cucumber / Gherkin):

| Spec | Pages | TMS |
|------|-------|-----|
| `tests/ui/welcome.spec.ts` | `WelcomePage`, `PhoneOtpFormComponent` | `TC-1` via `allure.tms` |
| `tests/ui/completeprofile.spec.ts` | `WelcomePage`, `SignupPage` | `TC-2` via `allure.tms` |

Shared: `BasePage`, `src/fixtures/loyalty.fixture.ts`, `src/config/*`, `src/utils/testData.ts`, `src/utils/logger.ts`.

Reserved: `tests/api/` + `docs/api-enrollment-endpoints-reference.md` for a future **verified** API enrollment rewrite (not populated yet).

## Reporting & GitHub linkage

End-to-end chain:

`GitHub Issue #N` → `allure.tms("N")` / tag `TC-N` on the test → `expect()` in `test.step` → Allure TMS link → optional `docs/traceability-matrix.md`

| Piece | Where |
|-------|--------|
| TMS link | `tests/ui/*.spec.ts` (`allure.tms`, `allure.tags`) |
| Failure screenshot / video / trace | Playwright `use` + `allure-playwright` |
| Matrix | `npm run traceability:generate` → `docs/traceability-matrix.md` |

```bash
npm run test:loyalty
npm run allure:report
npm run traceability:generate
```

- `TEST_ENV` → `env.{dev|qa|prod}.ts`
- Secrets via `.env` / GitHub Actions (`BASE_URL`, `SIGNUP_OTP`, `VERCEL_PROTECTION_BYPASS`)
- Vercel bypass headers from `buildBrowserContextOptions()` in `playwright.config.ts`

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
   - Traceability (`docs/traceability-matrix.md` or Allure TMS links for `TC-*`)
   - POM reuse under `src/pages/` (no duplicate page objects; no hardcoded waits)
4. Structural migrations (runner swap, deleting suites, changing secrets/CI contracts) require **explicit sign-off** before merge — a green pipeline alone is not enough.
