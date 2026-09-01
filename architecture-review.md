# Architecture Review — PlaywrightAutomationAgent

**Date:** 2026-09-01  
**Scope inspected:** Loyalty Cucumber stack as it exists on disk today (`welcome` + `completeprofile` only)  
**Reviewer stance:** Senior software / test-architecture design review — evidence-based, not a generic checklist  

**Stack summary:** Cucumber.js Gherkin → TypeScript step defs → Playwright POM → browser launched in Cucumber hooks. Reporting via Allure 3 + Winston + Playwright traces. No application server, DB, or REST API product under test in-repo — this is a **test automation framework**, so reliability/scalability are judged for suite growth, CI cost, and flaky external Loyalty UI — not backend throughput.

---

## Summary table

| Category | Current State | Risk Level | Suggested Action |
|----------|---------------|------------|------------------|
| Overall architecture | Clear Feature → Steps → Pages layering; Loyalty-only scope | **Low** | Keep; document as the only supported runner |
| Module cohesion | Asymmetric POM (`WelcomePage`+component vs god `SignupPage`) | **High** | Split `SignupPage.ts`; extend `BasePage` |
| Coupling | Hooks/config still tied to dead OCE; `process.env` mutation | **Medium** | Delete/quarantine `oceAuth`; stop OCE env seeding |
| Reliability / errors | Widespread soft `.catch(() => false)` + early return in signup | **High** | Required vs optional UI contracts; fail loud on required |
| Observability | Strong Allure TMS + traces + CI summary; thin Winston usage | **Low–Medium** | Log soft-skips; keep Allure/trace path |
| Config | Env files good; `env.prod` points at QA; hardcoded BasePage fallback | **Medium** | Fail-fast if prod URL == QA; remove duplicate URL default |
| Flexibility | Easy to add a feature; SignupPage is the friction point | **Medium** | Componentize signup; keep World/hooks stable |
| Scalability (suite) | 2 scenarios; parallel OK for World, risky for OTP/UI | **Medium** | Cap workers=1 for enrollment; grow by domain folders later |
| Dependencies | Modern Cucumber/Playwright/Allure 3; no `playwright.config` | **Low** | Keep; pin majors in CI |
| Test coverage | Happy-path only (`@TC-1`, `@TC-2`); no negatives | **High** for product risk | Add negative/OTP-fail cases; UNIQUE phone on welcome |
| CI/CD | Lint + typecheck + browser matrix + artifacts | **Low** | Keep; clean `allure-results` before generate |

---

## 1. Overall Architecture Assessment

### 1.1 Pattern vs project size

The current pattern is **appropriate** for a small-to-medium Loyalty UI automation suite:

```
features/                 # Gherkin (2 files)
src/steps/                # Thin Cucumber glue
src/pages/ (+ components) # Page Object Model
src/hooks/                # Browser lifecycle + Allure/traces
src/config/               # TEST_ENV → env.{dev|qa|prod}
src/utils/logger.ts       # Winston
scripts/                  # CI helpers (Allure summary, traceability)
.github/workflows/ci.yml
```

Wiring is explicit in [`cucumber.js`](cucumber.js): `require: ['src/hooks/world.ts', 'src/hooks/hooks.ts', 'src/steps/**/*.ts']` and tags limited to `(@welcome or @completeprofile)`.

This is **not** a layered backend (controllers / domain / data access). Mapping those concepts:

| Backend analogy | This repo |
|-----------------|-----------|
| Controllers / entry | `features/*.feature` + Cucumber profiles |
| Application services | `src/steps/*.ts` |
| Domain / UI adapters | `src/pages/*` |
| Infrastructure | `hooks`, `browser.factory`, `config`, Allure |

For **current size** (~2 scenarios), the structure is slightly richer than necessary but intentional (agents, Allure TMS, CI). For **likely growth** (more Loyalty journeys), it will hold if Signup-style god files are not allowed to multiply.

### 1.2 Separation of concerns

**Clean:**

- Gherkin does not contain selectors.
- Steps in [`src/steps/welcome.steps.ts`](src/steps/welcome.steps.ts) / [`signup.steps.ts`](src/steps/signup.steps.ts) mostly delegate to pages.
- Browser isolation is owned by [`PlaywrightWorld`](src/hooks/world.ts) + [`hooks.ts`](src/hooks/hooks.ts), not module globals.

**Leakage / tight coupling:**

1. **Assertion location conflict** — [`BasePage.ts`](src/pages/BasePage.ts) documents that Cucumber asserts belong in steps, but [`SignupPage.expectDashboardPoints`](src/pages/SignupPage.ts) embeds Playwright `expect` in the page. Steps become a one-liner pass-through.
2. **Infrastructure in POM** — `ensureReportDirs()` lives on [`BasePage.ts`](src/pages/BasePage.ts) (lines 67–72) but is called from hooks. Reporting dirs are not a page concern.
3. **Dead product surface in config** — [`oceAuth.ts`](src/config/oceAuth.ts) exports `resolveOceAuthConfig` with **zero importers** in remaining `src/`. Env modules and hooks still seed `OCE_BASE_URL`, coupling Loyalty runs to a deleted OCE suite.

### 1.3 Coupling and cohesion (with examples)

| Module | Cohesion | Coupling | Evidence |
|--------|----------|----------|----------|
| `WelcomePage` + `PhoneOtpFormComponent` | High | Low | Composition; extends `BasePage`; ~46 + ~37 lines |
| `SignupPage` | Low (many unrelated UI phases) | High (raw `Page`, multi-strategy locators, soft skips) | **~433 lines**, no `BasePage` |
| `PlaywrightWorld` | High | Low | Scenario-scoped browser/page/`phoneNumber` |
| `hooks.ts` | Medium (lifecycle + reporting) | Medium | Imports config + BasePage helper; mutates `process.env` |
| `oceAuth.ts` | N/A (dead) | Noise | Unused after OCE deletion |

**Coupling smell — page import style inconsistency:**

- `WelcomePage` / hooks / steps → `@playwright/test`
- `SignupPage` → `import { type Locator, type Page } from 'playwright'` and `expect` from `@playwright/test`

Two vendor entry points for the same automation surface.

**Verdict:** Architecture grade **B** for Loyalty scope; main structural debt is **one god page** and **leftover OCE config**, not the overall folder layout.

---

## 2. Reliability

### 2.1 Error handling

**Centralized / good:**

- Config fails fast if Loyalty URL missing: [`src/config/env.ts`](src/config/env.ts) `assertBaseUrlConfigured`.
- World fails fast if hooks skipped: `requirePage()` throws in [`world.ts`](src/hooks/world.ts).
- `clickCreateAccount` in SignupPage rethrows with validation text context (better pattern than soft returns).

**Swallowed / inconsistent (high flake and false-green risk):**

[`SignupPage.ts`](src/pages/SignupPage.ts) uses dozens of:

```ts
if (!(await field.isVisible().catch(() => false))) return;
await target.first().waitFor({ state: 'hidden', ... }).catch(() => {});
await box.check({ force: true });
```

Concrete methods: `confirmPhoneNumber`, `enterReferralCode`, `clickApplyOnSignUpForm`, `closeFirstDialog` / `closeSecondDialog`, `claimBirthdayPoints`, onboarding overlay helpers.

**What’s wrong:** Optional UI is indistinguishable from “locator broke / overlay never appeared.” The suite can pass while product regressions ship.

**What to do:** Classify each interaction as **required** (assert visible, then act) or **optional** (`tryDismissX(): Promise<'dismissed'|'absent'>` + Winston/Allure step note). Ban empty `.catch(() => {})` on required waits via ESLint review of `src/pages/**`.

**Hooks teardown** uses `.catch(() => {})` on `page/context/browser.close()` — acceptable for cleanup. Failure-path tracing logs when attach fails ([`attachFailureTrace`](src/hooks/hooks.ts)) — good.

### 2.2 Logging / observability

| Channel | Present? | Gap |
|---------|----------|-----|
| Winston → `reports/logs/execution.log` | Yes ([`logger.ts`](src/utils/logger.ts)) | Almost only used from `hooks.ts`; pages/steps silent on soft-skips |
| Allure results + TMS `@TC-*` | Yes ([`cucumber.js`](cucumber.js) links) | Stale `reports/allure-results` can pollute generated HTML if not cleaned |
| Playwright trace zip on fail | Yes (Allure attachment `playwright-trace.zip`) | Strong — keep |
| Screenshots on fail | Yes (AfterStep + After) | Strong — keep |
| CI Job Summary + traceability matrix | Yes (`scripts/ci-job-summary.js`, `generate-traceability.js`) | Matrix status needs fresh Allure results |

**Production visibility:** For a test framework, “production” = CI. Visibility is **good** if artifacts are retained. Missing: structured fields (TC id, browser, env) on every Winston line; soft-skip events never logged.

### 2.3 Retry / timeout / external calls

- Scenario timeout: 120s (`setDefaultTimeout` in hooks); page default 60s.
- Cucumber retry: `CUCUMBER_RETRY` default **1 in CI, 0 locally** ([`cucumber.js`](cucumber.js)) — can mask flaky overlays.
- No API client left in tree; Loyalty UI is the only “external” dependency. No circuit breaker / health check — appropriate for E2E against a Vercel app, but **no preflight** (e.g. `BASE_URL` HEAD) before launching browsers → wasted CI minutes on down envs.
- OTP depends on live SMS/harness / `SIGNUP_OTP` — single point of failure for `@TC-2`.

### 2.4 Input validation / boundaries

- Gherkin Examples + UNIQUE phone generation in steps — good for uniqueness.
- Welcome feature still uses **fixed** `"+1234567890"` ([`welcome.feature`](features/welcome.feature)) — boundary/collision risk if that number is already enrolled.
- No schema validation layer (N/A for this project type); edge validation is locator-level only.

### 2.5 Single points of failure

1. Live Loyalty environment availability.  
2. OTP delivery / `SIGNUP_OTP` secret.  
3. `SignupPage` as sole owner of enrollment UI — any change there blocks `@TC-2`.  
4. No suite-level health gate before matrix browsers × 3.

### 2.6 Test coverage of critical paths

| Path | Covered? |
|------|----------|
| Welcome UI + Get Code happy path | Yes `@TC-1` |
| Full enrollment + profile + points | Yes `@TC-2` (one Examples row) |
| Invalid OTP / expired code | **No** |
| Existing-user skip-signup behavior | Partially accidental via fixed phone on welcome |
| Cross-browser | Yes in CI matrix |
| Negative consent / missing required fields | **No** |

Failure/edge cases are **under-tested**; soft optionals further weaken signal from the one happy path.

---

## 3. Flexibility & Extensibility

### 3.1 Adding a new Loyalty feature

**Easy path (matches conventions):**

1. `features/<name>.feature` with `@<module> @smoke @TC-<issue>`
2. `src/steps/<name>.steps.ts` with `// TC-n` on `Then`/`expect`
3. New `*Page.ts` under `src/pages/`, export from [`pages/index.ts`](src/pages/index.ts)
4. Extend tags in [`cucumber.js`](cucumber.js) `LOYALTY_TAGS` if needed

**Friction:**

- Anything touching enrollment tends to grow [`SignupPage.ts`](src/pages/SignupPage.ts) further.
- Smoke vs regression tags currently select the **same two scenarios** (both features tagged `@smoke` and `@regression`) — no real profile differentiation yet.
- Agent/docs still mention hybrid Playwright Test in places ([`SKILL.md`](.cursor/skills/jira-to-playwright-agent/SKILL.md) remnants) while `playwright.config.ts` / `tests/` are gone — AI agents may generate the wrong runner.

### 3.2 Configuration externalization

**Good:** `TEST_ENV`, `.env` / `.env.example`, CI secrets `BASE_URL`, `SIGNUP_OTP`, `ALLURE_TMS_URL`.

**Hardcoded / risky:**

- [`env.prod.ts`](src/config/env.prod.ts) `baseUrl` is the **QA** Vercel URL (comment admits it).
- [`BasePage.loyaltyBaseUrl()`](src/pages/BasePage.ts) hardcodes a dev Vercel fallback — bypasses fail-fast config if env cleared mid-run.
- Practice/location defaults still hardcoded in OCE-shaped env objects.

### 3.3 Abstractionsctions for swapping implementations

| Concern | Abstraction | Notes |
|---------|-------------|-------|
| Browser launch | `browser.factory.ts` | Good, small |
| Page base | `BasePage` | Underused by SignupPage |
| OTP UI | `PhoneOtpFormComponent` | Good; Welcome-only |
| Auth / API enroll | Removed | Re-adding should be `src/api/` + World fields, not page bloat |
| Reporting | Allure via cucumber formatOptions | Tight to Allure 3 — acceptable; switching reporters is localized to `cucumber.js` + hooks |

**Premature abstraction:** Not a problem. Dead `oceAuth` is the opposite (leftover, not over-engineered).

### 3.4 Naming / conventions for humans and agents

Consistent where it matters: `*.feature`, `*.steps.ts`, `*Page.ts`, `@TC-*`, npm scripts `test:welcome` / `test:completeprofile`.  

Inconsistency: Signup not extending BasePage; Feature-level vs Scenario-level tags (TC tags correctly on Scenario now).

---

## 4. Scalability Considerations

This is not a request-serving app. Scalability = **suite size, CI time, parallel safety, team concurrency**.

| Growth dimension | Holds? | Notes |
|------------------|--------|-------|
| 10–20 Loyalty scenarios | Yes | Keep domain folders later (`features/loyalty/`) |
| Parallel workers >1 for enrollment | Risky | `phoneNumber` + OTP + shared env; scripts correctly force `PARALLEL_WORKERS=1` for loyalty |
| Browser matrix × full regression | Costly | Smoke should stay thin; don’t put full enrollment on every browser until stable |
| Data volume | N/A | UNIQUE phones avoid collisions; no DB |
| Team size | Medium | God `SignupPage` will cause merge conflicts |

**Bottlenecks:** Live UI + OTP latency (not N+1 queries). Synchronous browser-per-scenario is correct for isolation but expensive — acceptable until suite is large; then consider shared browser + new context (not shared page).

**Stale Allure results** (~many files under `reports/allure-results`) already caused misleading reports — operational scalability issue: always wipe results before `allure:generate` in local docs/CI.

---

## 5. Dependency & Tooling Health

| Package | Role | Assessment |
|---------|------|------------|
| `@cucumber/cucumber` ^12 | Runner | Current, fine |
| `@playwright/test` ^1.58 | Browser API (not Test runner) | Fine; name confuses newcomers expecting `playwright.config.ts` |
| `allure` ^3.16 + `allure-cucumberjs` | Reporting | Allure 3 UI differs from classic Allure 2 — intentional |
| `winston` | Logging | Fine |
| `dotenv` | Env | Fine |
| ESLint + SonarJS + Prettier | Quality | Present; pages on warn for complexity — debt allowed to grow |

**Tight coupling:** Cucumber + Playwright + Allure 3. Replacing any one is localized but non-trivial. No unmaintained oddball libs.

**Risk:** `@playwright/test` without Playwright Test config means `npx playwright test` is a footgun — document “Cucumber only” (already in README/FRAMEWORK).

No `npm audit` gate in CI; one high vuln was noted historically — add periodic audit.

---

## 6. Concrete Recommendations

### High impact

1. **Split [`src/pages/SignupPage.ts`](src/pages/SignupPage.ts)** into components (OTP reuse, profile form, DOB picker, onboarding overlays, dashboard assert). Extend `BasePage`.  
   - *Trade-off:* Short-term churn vs ongoing flake/merge cost.  
2. **Replace soft-return optional flows** with explicit required/optional contracts; log soft outcomes.  
   - *Trade-off:* More reds initially; fewer false greens.  
3. **Align welcome phone with UNIQUE** (or fixture factory) — [`features/welcome.feature`](features/welcome.feature) fixed `+1234567890`.  
4. **Move dashboard `expect` into steps**; page returns locators/text only — matches [`BasePage`](src/pages/BasePage.ts) contract.  
5. **Delete or quarantine [`src/config/oceAuth.ts`](src/config/oceAuth.ts)** and stop seeding `OCE_*` in hooks/env examples until OCE returns.

### Medium impact

6. **Fail-fast when `TEST_ENV=prod` and `baseUrl` equals QA** ([`env.prod.ts`](src/config/env.prod.ts)).  
7. **Remove hardcoded URL fallback** from `BasePage.loyaltyBaseUrl()` — rely on config assert only.  
8. **Differentiate smoke vs regression tags** (e.g. welcome-only smoke; completeprofile regression) so CI matrix stays cheap.  
9. **Wipe `reports/allure-results` before generate** in `allure:generate` script / CI to avoid stale suites.  
10. **Move `ensureReportDirs` to `src/utils/` or hooks** — stop pages owning report dirs.  
11. **Add 1–2 negative scenarios** (bad OTP, missing consent) tagged `@regression` not `@smoke`.

### Low impact

12. Unify imports on `@playwright/test` in SignupPage.  
13. Structured Winston metadata (`tcId`, `browser`).  
14. Preflight HTTP check of `BASE_URL` in `BeforeAll`.  
15. Reconcile agent `SKILL.md` with Cucumber-only reality so generators don’t recreate `tests/`.

---

## 7. What is already well-designed (do not rewrite)

- **Feature → steps → pages** layering and Loyalty-only `LOYALTY_TAGS` gate in [`cucumber.js`](cucumber.js).  
- **Per-scenario World** ([`world.ts`](src/hooks/world.ts)) — correct parallel isolation model.  
- **WelcomePage + PhoneOtpFormComponent** composition — template for Signup splits.  
- **Fail-fast BASE_URL** at config load.  
- **Browser factory** with explicit browser allow-list.  
- **Allure TMS `@TC-*` → GitHub Issues**, failure screenshots/traces, CI Job Summary, traceability matrix.  
- **CI pipeline shape:** static checks → browser matrix → generate Allure → upload artifacts → fail on Cucumber outcome.  
- **PowerShell-safe sequential scripts** (`scripts/run-sequential.js`) for `allure:report` / all-browsers.  
- **No `waitForTimeout` sleeps** in remaining Loyalty pages (condition waits instead).

---

## 8. Closing assessment

This codebase is a **coherent, intentionally slimmed Loyalty Cucumber framework** with above-average reporting/traceability for its size. It is **not** in need of a greenfield rewrite.

The architecture will remain healthy if the team enforces three rules going forward:

1. **No new god pages** — compose like Welcome/PhoneOtp.  
2. **No silent soft-skips on required UI.**  
3. **Config matches product scope** — no dead OCE surface, no prod→QA URL lie.

Without those, growth will reintroduce the hybrid sprawl this repo just escaped, and Allure/CI will report false confidence.

---

*Generated from static inspection of the repository tree, key modules under `src/`, `features/`, `cucumber.js`, `package.json`, and `.github/workflows/ci.yml`.*
