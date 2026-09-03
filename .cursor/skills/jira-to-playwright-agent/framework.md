# Framework map (Jira-to-Playwright agent)

Canonical detail: [`docs/FRAMEWORK.md`](../../../docs/FRAMEWORK.md)

| Spec | Pages | TMS |
|------|-------|-----|
| `tests/ui/welcome.spec.ts` | `WelcomePage`, `PhoneOtpFormComponent` | `TC-1` |
| `tests/ui/completeprofile.spec.ts` | `WelcomePage`, `SignupPage` | `TC-2` |

```
playwright.config.ts        # ui + api projects, Allure, traces
tests/ui/                   # active Playwright specs
tests/api/                  # reserved
src/page-objects/           # POM
src/fixtures/               # loyalty.fixture.ts
src/config/                 # env + browser.factory
src/data/                   # constants.json
docs/api-enrollment-endpoints-reference.md
```

Prefer extending `tests/ui/` specs and `src/page-objects/`. Use `allure.tms` / `TC-*` for GitHub Issue linkage. No Cucumber / `features/` / `src/steps/`.
