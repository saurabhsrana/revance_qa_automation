# Playwright Framework Map (this repo)

**Product:** REVA Loyalty only. Config: `baseUrl` via `TEST_ENV` → `src/config/env.{dev|qa|prod}.ts` (config folder kept full including `oceAuth`).

| Feature | Steps | Pages | TMS tag |
|---------|-------|-------|---------|
| `features/welcome.feature` | `src/steps/welcome.steps.ts` | `WelcomePage`, `PhoneOtpFormComponent` | `@TC-1` |
| `features/completeprofile.feature` | `src/steps/signup.steps.ts` | `SignupPage` | `@TC-2` |

## Layout

```
cucumber.js                 # loyalty tags + Allure + cucumber.json
allurerc.cjs
features/
src/pages/ hooks/ steps/ config/ utils/logger.ts
scripts/ci-job-summary.js   # GitHub Job Summary TC links
```

## Reporting

Allure only. After runs: `npm run allure:generate`. CI uploads Allure + Job Summary with `@TC-*` → GitHub Issues.

## Agent output

Prefer extending these two features/steps/pages. Add new `@TC-*` tags for GitHub Issue linkage.
