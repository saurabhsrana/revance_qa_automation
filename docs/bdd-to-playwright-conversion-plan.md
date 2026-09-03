# BDD → Playwright Test conversion plan

**Status:** Phase 1 audit only — **no code changes yet**. Awaiting confirmation before Phase 2.

**Audit date:** 2026-09-02  
**Scope requested:** `welcome.feature`, `completeprofile.feature`, `apiProfileEnrollment.feature`

---

## 0. Inventory reality check (updated)

| Artifact | Expected by request / skill docs | Present in repo today? |
|----------|----------------------------------|------------------------|
| `features/welcome.feature` | Yes | **Yes** |
| `features/completeprofile.feature` | Yes | **Yes** |
| `features/apiProfileEnrollment.feature` | Yes | **Yes** (pulled from `vaibhav12-tech/PlaywrightAutomationAgent`) |
| `src/steps/apiEnrollment.steps.ts` | Yes | **Yes** (adapted to `src/steps/`) |
| `src/api/loyaltyEnrollment.ts` / `ApiClient` | Yes | **Yes** (pulled from upstream) |
| `src/pages/HomePage.ts` | Required by API enrollment steps | **Yes** (pulled from upstream) |
| `reports/enrollment-api-discovery.json` | Discovery dump | **Yes** (supplemental) |
| `playwright.config.ts` | Phase 2 target | **No** — Cucumber is the only runner (`cucumber.js`) |

**Implication:** Phase 2 can convert **all 3 feature files** (welcome, completeprofile, apiProfileEnrollment). See §1.3 for the API enrollment step → API/page mapping (added after upstream pull).

**Decision needed from you before/at Phase 2 start:**

1. Convert **all three** suites (recommended now that API enrollment is present); **or**
2. Convert welcome + completeprofile first, API enrollment second; **or**
3. Still prefer greenfield Playwright API tests that bypass Gherkin (not recommended now that the feature exists).

---

## 1. Feature inventory (execution-order call chains)

### 1.1 `features/welcome.feature`

**Feature tags:** `@welcome` `@smoke` `@regression`  
**Feature title:** Revance Welcome Page

#### Scenario: User visits the welcome page and verifies UI elements

| Item | Value |
|------|--------|
| Scenario tags | `@TC-1` |
| Examples / Outline | None |
| Active steps | **1** (others commented out) |

| # | Step (active / commented) | Step definition | Page object / API call chain |
|---|---------------------------|-----------------|------------------------------|
| 1 | **Given** I am on the Revance Welcome page | `welcome.steps.ts` | `new WelcomePage(page).goto()` → `BasePage.goto(loyaltyBaseUrl + /welcome)` → `PhoneOtpFormComponent.phoneInput().waitFor({ state: 'visible' })` |
| — | ~~When I enter the phone number "+1234567890"~~ | (defined, unused) | Would call `resolvePhone()` then `WelcomePage.enterPhoneNumber` → `PhoneOtpFormComponent.enterPhoneNumber` |
| — | ~~And I click the Verify button~~ | (defined, unused) | Would call `WelcomePage.clickVerify` → `PhoneOtpFormComponent.clickGetCodeAndWaitForOtp` |
| — | ~~Then the main heading should be "Love your look (and more)"~~ | (defined, unused) | Would call `WelcomePage.getHeading()` then `expect(...).toBe(...)` **in step** |
| — | ~~And the Contact Us link should be visible~~ | (defined, unused) | Would assert `page.getByRole('link', { name: /contact us/i })` **inline in step** (page has `isContactUsVisible` / `clickContactUs` unused by this step) |

**Effective coverage today:** navigation to welcome + wait for phone field only. No heading / Contact Us assertions run in CI.

---

### 1.2 `features/completeprofile.feature`

**Feature tags:** `@completeprofile` `@loyaltyProfile` `@smoke` `@regression`  
**Feature title:** Revance complete profile  
**Notes in file:** OTP via `SIGNUP_OTP` env override; run via `npm run test:completeprofile`

#### Scenario Outline: User completes sign-up, profile questions, and sees the rewards dashboard

| Item | Value |
|------|--------|
| Scenario tags | `@TC-2` |
| Outline type | Scenario Outline + Examples |
| `@signup` tag | **Not used** (no `@signup` anywhere in these features) |

**Examples table (1 row):**

| phone | verification_code | first_name | last_name | date_of_birth | email | zip | referral_code | expected_points |
|-------|-------------------|------------|-----------|---------------|-------|-----|---------------|-----------------|
| `UNIQUE` | `112233` | John | Doe | `1992-08-03` | `john.doe@test.com` | `90210` | `REF123` | `250` |

`UNIQUE` is resolved in the step layer to a fresh 10-digit phone (`9` + last 9 digits of `Date.now()`), stored on Cucumber World as `phoneNumber`.

| # | Step | Step definition | Page object / API call chain |
|---|------|-----------------|------------------------------|
| 1 | Given I am on the Revance Welcome page | `welcome.steps.ts` | Same as welcome §1.1 step 1 |
| 2 | When I enter the phone number `"<phone>"` | `welcome.steps.ts` | `resolvePhone(phone)` → World.`phoneNumber` = resolved → `WelcomePage.enterPhoneNumber` → `PhoneOtpFormComponent.enterPhoneNumber` (digits only, `pressSequentially`) |
| 3 | And I click the Verify button | `welcome.steps.ts` | `WelcomePage.clickVerify` → `PhoneOtpFormComponent.clickGetCodeAndWaitForOtp` (click Get Code/Verify → wait OTP input visible) |
| 4 | And I enter the verification code `"<verification_code>"` | `signup.steps.ts` | OTP = `process.env.SIGNUP_OTP ?? code` → `SignupPage.enterVerificationCode` |
| 5 | And I confirm my phone number | `signup.steps.ts` | `SignupPage.confirmPhoneNumber` (conditional: skip if first name visible; else Confirm/Continue/… or wait for form) |
| 6 | And I enter my first name `"<first_name>"` | `signup.steps.ts` | `SignupPage.enterFirstName` |
| 7 | And I enter my last name `"<last_name>"` | `signup.steps.ts` | `SignupPage.enterLastName` |
| 8 | And I select my date of birth `"<date_of_birth>"` | `signup.steps.ts` | `SignupPage.selectDateOfBirth` (native date / REVA month-day-year / Svelte calendar / selects) |
| 9 | And I enter my email `"<email>"` | `signup.steps.ts` | **Step conditional:** if email is `john.doe@test.com` and World has `phoneNumber`, rewrite to `john.doe+{last8}@test.com` → `SignupPage.enterEmail` |
| 10 | And I enter my zip code `"<zip>"` | `signup.steps.ts` | `SignupPage.enterZipCode` |
| 11 | And I enter my referral code `"<referral_code>"` | `signup.steps.ts` | `SignupPage.enterReferralCode` (no-op if field missing) |
| 12 | And I click Apply on the sign-up form | `signup.steps.ts` | `SignupPage.clickApplyOnSignUpForm` (no-op if Apply missing) |
| 13 | And I accept all required consent checkboxes | `signup.steps.ts` | `SignupPage.acceptAllConsentCheckboxes` |
| 14 | And I click the Create account button | `signup.steps.ts` | `SignupPage.clickCreateAccount` (+ `waitForURL` leave `/signup`) |
| 15 | And I click Next on the reward claim screen | `signup.steps.ts` | `SignupPage.clickNextRewardClaimScreen` → `clickOnboardingNext` |
| 16 | And I click Next on the follow-up screen | `signup.steps.ts` | `SignupPage.clickNextFollowUpScreen` → `clickOnboardingNext` |
| 17 | And I check the checkbox of all questions to complete the profile | `signup.steps.ts` | `SignupPage.checkAllProfileQuestionCheckboxes` (also advances welcome overlays) |
| 18 | And I claim the birthday points | `signup.steps.ts` | `SignupPage.claimBirthdayPoints` (best-effort; may soft-skip if no CTA) |
| 19 | Then I should see the dashboard with `"<expected_points>"` reward points | `signup.steps.ts` | `SignupPage.expectDashboardPoints` → `expect(getByText(...)).toBeVisible` |

**Unused but defined steps (not in this feature):** `I close the first dialog`, `I close the second dialog` → `SignupPage.closeFirstDialog` / `closeSecondDialog`.

**API calls:** none from step definitions. Enrollment is **UI-only**. Network APIs happen inside the app; tests do not call `ApiClient` / `loyaltyEnrollment`.

---

### 1.3 `features/apiProfileEnrollment.feature`

**Source:** pulled from `vaibhav12-tech/PlaywrightAutomationAgent`  
**Feature tags:** `@loyaltyProfile` `@apiEnrollment` `@smoke` `@regression`  
**Feature title:** User profile enrollment and verification via API  
**Steps:** `src/steps/apiEnrollment.steps.ts`  
**API:** `src/api/loyaltyEnrollment.ts` (`enrollLoyaltyProfileViaApi`) + `src/api/ApiClient.ts` (standalone helper; not used by this Gherkin flow)  
**Page:** `src/pages/HomePage.ts`

#### Scenario Outline: Enroll profile via API and verify name on Home

**Examples (1 row):**

| phone | verification_code | first_name | last_name | date_of_birth | email | zip |
|-------|-------------------|------------|-----------|---------------|-------|-----|
| `UNIQUE` | `112233` | John | Doe | `1992-08-03` | `john.doe@test.com` | `90210` |

| # | Step | Step definition | Call chain |
|---|------|-----------------|------------|
| 1 | Given I enroll a loyalty profile via API with: (DataTable) | `apiEnrollment.steps.ts` | `enrollLoyaltyProfileViaApi(page, …)` → browser-origin POSTs: `/api/phone/check-voip`, `/api/auth/phone-number/send-otp`, `/welcome?/submitPhone`, `/otp-confirmation`, `/api/auth/phone-number/verify`, `/otp-confirmation?/verifyPhone`, `/api/customers/signup`, then goto `/profile-building?destination=dashboard` → wait `/dashboard`. Stores `World.enrollment`, `enrolledName`, `phoneNumber`. Asserts URL is dashboard (not signup). |
| 2 | Then the profile enrollment should be successful | `apiEnrollment.steps.ts` | Asserts `enrollment.success`, `rawSignupResponse.success`, `customerId` matches `/^CL/i`, name non-empty |
| 3 | When I navigate to the Home page while logged in | `apiEnrollment.steps.ts` | `new HomePage(page).goto()` → `/dashboard`; assert not signup; store `World.homePage` |
| 4 | Then the Home page should display the enrolled user name | `apiEnrollment.steps.ts` | `HomePage.expectEnrolledUserName(enrolledName)` |

**Known Phase 2 cleanup in `loyaltyEnrollment.ts`:** `postJsonWithRetry` still uses `waitForLoadState('networkidle')` + `setTimeout` on Vercel checkpoint retries — replace with locator-based waits during conversion as requested.

---

## 2. Scenario → Playwright Test mapping (proposed)

### Proposed layout

```
tests/
  welcome.spec.ts
  completeprofile.spec.ts
  # api-profile-enrollment.spec.ts   ← only if you choose option 3 in §0
src/
  fixtures/
    loyalty.fixture.ts               ← replaces Cucumber World + Before/After browser lifecycle
  pages/                             ← unchanged
  config/                            ← unchanged
  utils/                             ← unchanged
```

Tags (`@smoke`, `@regression`, `@TC-*`) become Playwright annotations / Allure labels / grep tags, e.g. `test.describe.configure` + `allure.tms('1')` / `test.info().annotations`.

---

### 2.1 Welcome → `tests/welcome.spec.ts`

```ts
test.describe('Revance Welcome Page', () => {
  test('User visits the welcome page and verifies UI elements @TC-1', async ({ welcomePage }) => {
    await test.step('I am on the Revance Welcome page', async () => {
      await welcomePage.goto();
    });
    // Optional Phase 2 decision: restore commented Gherkin as additional steps or leave as-is
  });
});
```

| Gherkin | Proposed `test.step` | Underlying calls |
|---------|----------------------|------------------|
| Given I am on the Revance Welcome page | `test.step('I am on the Revance Welcome page', …)` | `welcomePage.goto()` |

**Open decision:** Whether Phase 2 **restores** the four commented steps as live assertions (heading + Contact Us). Plan default = **preserve current effective coverage** (goto only) unless you ask to uncomment.

---

### 2.2 Complete profile → `tests/completeprofile.spec.ts`

```ts
test.describe('Revance complete profile', () => {
  test('User completes sign-up, profile questions, and sees the rewards dashboard @TC-2', async ({
    welcomePage, signupPage, loyaltyState,
  }) => {
    // data from former Examples row (or test.use / const fixture data)
  });
});
```

Examples row becomes a **const test data object** (or `test.extend` fixture), not a Gherkin table:

```ts
const profileData = {
  phone: 'UNIQUE', // resolved by helper
  verificationCode: '112233',
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: '1992-08-03',
  email: 'john.doe@test.com',
  zip: '90210',
  referralCode: 'REF123',
  expectedPoints: '250',
};
```

| # | Gherkin step | Proposed `test.step` text | Underlying method(s) |
|---|--------------|---------------------------|----------------------|
| 1 | Given I am on the Revance Welcome page | same | `welcomePage.goto()` |
| 2 | When I enter the phone number… | same (with resolved phone) | `resolveUniquePhone` → `loyaltyState.phoneNumber` → `welcomePage.enterPhoneNumber` |
| 3 | And I click the Verify button | same | `welcomePage.clickVerify()` |
| 4 | And I enter the verification code… | same | `signupPage.enterVerificationCode(process.env.SIGNUP_OTP ?? code)` |
| 5 | And I confirm my phone number | same | `signupPage.confirmPhoneNumber()` |
| 6–11 | enter first/last/DOB/email/zip/referral | same | matching `signupPage.*` |
| 12 | And I click Apply… | same | `signupPage.clickApplyOnSignUpForm()` |
| 13 | And I accept all required consent… | same | `signupPage.acceptAllConsentCheckboxes()` |
| 14 | And I click the Create account button | same | `signupPage.clickCreateAccount()` |
| 15–16 | Next reward / follow-up | same | `signupPage.clickNextRewardClaimScreen` / `clickNextFollowUpScreen` |
| 17 | check all profile question checkboxes | same | `signupPage.checkAllProfileQuestionCheckboxes()` |
| 18 | claim birthday points | same | `signupPage.claimBirthdayPoints()` |
| 19 | Then dashboard points | same | `signupPage.expectDashboardPoints(expected)` |

---

### 2.3 API profile enrollment → `tests/api-profile-enrollment.spec.ts`

```ts
test.describe('User profile enrollment and verification via API', () => {
  test('Enroll profile via API and verify name on Home @apiEnrollment', async ({
    page, homePage, loyaltyState,
  }) => { /* data from Examples row */ });
});
```

| Gherkin step | Proposed `test.step` | Underlying |
|--------------|----------------------|------------|
| Given I enroll a loyalty profile via API with: | same | `enrollLoyaltyProfileViaApi(page, data)` + URL asserts + store result on fixture state |
| Then the profile enrollment should be successful | same | asserts on `LoyaltyEnrollmentResult` |
| When I navigate to the Home page while logged in | same | `homePage.goto()` + URL asserts |
| Then the Home page should display the enrolled user name | same | `homePage.expectEnrolledUserName(name)` |

---

## 3. Step-only logic to relocate (not leave inline in specs)

These live in step definitions today and have **no dedicated page-object helper** (or only a partial one). During conversion they must move to `src/fixtures/` or a small `src/utils/` / page helper — **not** remain as anonymous logic inside `test.step` bodies beyond thin wiring.

| Logic | Current location | Recommended new home | Notes |
|-------|------------------|----------------------|-------|
| `resolvePhone('UNIQUE')` → `9` + timestamp digits | `welcome.steps.ts` | `src/utils/testData.ts` e.g. `resolveUniquePhone()` | Used by completeprofile; keep deterministic docs |
| Persist resolved phone across steps | Cucumber `World.phoneNumber` | Playwright fixture `loyaltyState: { phoneNumber?: string }` | Specs must not invent a second store |
| `SIGNUP_OTP` env override of Examples OTP | `signup.steps.ts` | Fixture helper or `signupPage.enterVerificationCodeFromEnv(code)` | Keep env-first behavior |
| Email uniquification `john.doe+{last8}@test.com` when email is `john.doe@test.com` | `signup.steps.ts` | `src/utils/testData.ts` e.g. `uniqueEmail(base, phone)` **or** `SignupPage.enterEmailForPhone(email, phone)` | Business/test-data rule, not UI locator |
| Heading assertion `expect(heading).toBe(...)` | `welcome.steps.ts` Then | Prefer `expect(await welcomePage.getHeading()).toBe(...)` in step **or** add `WelcomePage.expectHeading(text)` | Only if commented steps restored |
| Contact Us visibility assert via raw locator | `welcome.steps.ts` Then | Prefer `WelcomePage` locator/expect helper (`expectContactUsVisible`) — `isContactUsVisible` already exists but unused by step | Only if commented steps restored |
| Manual browser launch / tracing / Allure attachments | `hooks.ts` Before/After/AfterStep | **Delete** — replaced by Playwright `use: { trace, screenshot, video }` + `allure-playwright` | Do not port hook start/stop tracing into specs |
| Vercel protection bypass headers | `hooks.ts` via `buildBrowserContextOptions()` | `playwright.config.ts` `use.extraHTTPHeaders` or fixture context options | Keep CI bypass working |
| BASE_URL / OCE env fill from config when unset | `hooks.ts` Before | `playwright.config.ts` `use.baseURL` + dotenv load in config | Align with existing `src/config` |

**Already in page objects (keep calling from steps/specs — do not duplicate):** almost all of `SignupPage` and `WelcomePage` interactions listed in §1.

**`expectDashboardPoints` already uses Playwright `expect` inside the page object** — hybrid but acceptable for this mechanical conversion; optional later cleanup to return locator and assert in the test.

---

## 4. What stays unchanged

| Area | Paths | Notes |
|------|-------|-------|
| Page objects | `src/pages/WelcomePage.ts`, `SignupPage.ts`, `HomePage.ts`, `BasePage.ts`, `components/PhoneOtpFormComponent.ts`, `pages/index.ts` | Extend only if §3 helpers are added |
| API clients | `src/api/ApiClient.ts`, `src/api/loyaltyEnrollment.ts` | Keep; fix networkidle/setTimeout retries in Phase 2 |
| Config | `src/config/**` (`env.*`, `browser.factory.ts`, `oceAuth.ts`, `index.ts`) | Reuse for `baseURL` / headless / Vercel bypass |
| Logger | `src/utils/logger.ts` | Optional; Playwright reporter may reduce need |
| Allure CLI generate/open scripts pattern | `allurerc.cjs`, `scripts/allure-clean.js` | Point `resultsDir` at Playwright `allure-playwright` output (confirm path: `reports/allure-results` vs `allure-results`) |
| CI secrets | `BASE_URL`, `SIGNUP_OTP`, `VERCEL_PROTECTION_BYPASS` | Still required for QA |
| GitHub Pages Allure publish idea | `.github/workflows/ci.yml` publish job | Keep after runner command swap |

**World state to re-home (not keep Cucumber World):** `phoneNumber`, `enrollment`, `enrolledName`, `homePage` + browser/page lifecycle → Playwright fixtures / built-in `page`.

---

## 5. What gets removed (only after Phase 2 verified)

| Item | Reason |
|------|--------|
| `cucumber.js` | Runner replaced by `playwright.config.ts` |
| `features/*.feature` | Logic lives in `tests/*.spec.ts` |
| `src/steps/` (`welcome.steps.ts`, `signup.steps.ts`) | Replaced by specs + helpers |
| `src/hooks/world.ts` Cucumber `World` / `setWorldConstructor` | Replaced by fixtures |
| Cucumber lifecycle in `src/hooks/hooks.ts` (`Before`/`After`/`AfterStep`/`BeforeAll` from `@cucumber/cucumber`, manual tracing/screenshots) | Native Playwright + allure-playwright |
| `package.json` deps: `@cucumber/cucumber`, `allure-cucumberjs` | Add `allure-playwright`; keep `allure` CLI + `allure-js-commons` if still useful |
| npm scripts that invoke `cucumber-js` | Replace with `npx playwright test` (+ project/tag filters) |
| Gherkin Examples table / tag expressions in cucumber profiles (`LOYALTY_TAGS`, `@smoke and …`) | Become Playwright projects / `--grep` / folder filters |
| `scripts/ci-job-summary.js` Cucumber JSON parser | Regenerate against Playwright JSON / Allure results |
| `scripts/generate-traceability.js` Gherkin/@TC parsing assumptions | Map describe → test → status |
| `ts-node` **maybe** | Only required today for Cucumber TS loading; Playwright uses its own transform — remove if unused |

**Do not remove in Phase 3 without replacement:** `src/config/browser.factory.ts` helpers if still used by config/fixtures; Allure generate/upload CI steps.

---

## 6. Reporting notes for Phase 2 (preview — not implemented yet)

| Concern | Plan |
|---------|------|
| Trace / screenshot / video on failure | `playwright.config.ts` → `use: { trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure' }` |
| Allure step granularity | Each former Gherkin step → `test.step('…')` (Allure + Playwright HTML both show steps) |
| Hierarchy | `allure.epic('Loyalty')` / `allure.feature('<Feature title>')` / `allure.story('<scenario>')` or annotation API |
| TMS `@TC-n` | `allure.tms(...)` or link annotation → GitHub Issues URL (replace cucumber.js `formatOptions.links.tms`) |
| Auto-attach Playwright artifacts | Confirm in Phase 2 whether `allure-playwright` attaches trace/screenshot automatically; **only** add manual `allure.attachment` if it does not |
| Results path | Prefer keep `reports/allure-results` for CI artifact compatibility |

---

## 7. Phase 2 / 3 checklist (after your approval)

1. Add `playwright.config.ts` + `src/fixtures/loyalty.fixture.ts`.
2. Convert welcome + completeprofile per §2 (and API only if you choose §0 option 3).
3. Move §3 helpers out of steps into utils/fixtures/pages.
4. Run converted specs; match assertion/API coverage of current Cucumber effective paths.
5. Only then: delete BDD scaffolding (§5), swap CI to `npx playwright test`, refresh README / FRAMEWORK.md / traceability / job summary.

---

## 8. Confirmation questions (please answer before Phase 2)

1. **API enrollment:** Convert welcome+completeprofile only (**A**), wait for missing feature (**B**), or greenfield API spec from discovery JSON (**C**)?
2. **Welcome commented steps:** Keep current goto-only coverage (**keep**), or restore heading + Contact Us assertions (**restore**)?
3. **Spec directory:** Prefer `tests/` at repo root (**recommended**) or `src/tests/`?
4. **Examples data:** Hardcoded const in spec (**recommended** for 1 row) or Playwright parameterized `test.describe` / data-driven loop?

---

*End of Phase 1 plan. No repository code was modified except creation of this document. Waiting for confirmation to start Phase 2.*
