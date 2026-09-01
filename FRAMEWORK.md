# FRAMEWORK.md — Loyalty Cucumber (welcome + completeprofile)

## Scope

Only two Gherkin suites:

| Feature | Steps | Pages | TMS |
|---------|-------|-------|-----|
| `features/welcome.feature` | `src/steps/welcome.steps.ts` | `WelcomePage`, `PhoneOtpFormComponent` | `@TC-1` |
| `features/completeprofile.feature` | `src/steps/signup.steps.ts` | `SignupPage` | `@TC-2` |

Shared: `BasePage`, `src/hooks/*`, `src/config/*` (kept full), `src/utils/logger.ts`.

No Playwright Test `tests/`, no OCE/SauceDemo pages, no Jira defect reporter.

## Reporting & GitHub linkage (§15.2)

End-to-end chain:

`GitHub Issue #N` → `@TC-N` on `Scenario:` → `Then` step with `// TC-N` comment + `expect()` → Allure TMS link "Test Case #N" → optional `docs/traceability-matrix.md`

| Piece | Where |
|-------|--------|
| Scenario tag | `features/*.feature` (`@TC-1`, `@TC-2`) |
| Assertion comment | `src/steps/*.steps.ts` (`// TC-N — …`) |
| Auto TMS link | `cucumber.js` → `formatOptions.links.tms` |
| Failure trace in Allure | `src/hooks/hooks.ts` attaches `playwright-trace.zip` |
| Matrix | `npm run traceability:generate` → `docs/traceability-matrix.md` |

```bash
npm run test:loyalty
npm run allure:report
npm run traceability:generate
```

- `TEST_ENV` → `env.{dev|qa|prod}.ts`
- Secrets via `.env` / GitHub Actions (`BASE_URL`, `SIGNUP_OTP`)
- Hooks fill `BASE_URL` / `OCE_BASE_URL` **only when unset** (CI secrets win)

## Commands

```bash
npm run test:loyalty
npm run test:smoke
npm run allure:report
```
