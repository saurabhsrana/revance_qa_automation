import { test as base } from "@playwright/test";
import { SignupPage } from "../pages/SignupPage";
import { WelcomePage } from "../pages/WelcomePage";

export type LoyaltyState = {
  phoneNumber?: string;
};

type LoyaltyFixtures = {
  welcomePage: WelcomePage;
  signupPage: SignupPage;
  loyaltyState: LoyaltyState;
};

/**
 * Playwright fixtures replacing Cucumber World page objects + shared scenario state.
 */
export const test = base.extend<LoyaltyFixtures>({
  welcomePage: async ({ page }, use) => {
    await use(new WelcomePage(page));
  },

  signupPage: async ({ page }, use) => {
    await use(new SignupPage(page));
  },

  loyaltyState: async (_fixtures, use) => {
    const state: LoyaltyState = {};
    await use(state);
  },
});

export { expect } from "@playwright/test";
