import * as allure from "allure-js-commons";
import { test } from "../../src/fixtures/loyalty.fixture";
import { welcomeHeading } from "../../src/utils/testData";

/**
 * Converted from features/welcome.feature (@TC-1).
 * Restores formerly commented heading + Contact Us assertions.
 */
test.describe("Revance Welcome Page", () => {
  test("User visits the welcome page and verifies UI elements", async ({
    welcomePage,
  }) => {
    await allure.epic("Loyalty");
    await allure.feature("Revance Welcome Page");
    await allure.story("User visits the welcome page and verifies UI elements");
    await allure.tms("1", "Test Case #1");
    await allure.tags("welcome", "smoke", "regression", "TC-1");

    await test.step("I am on the Revance Welcome page", async () => {
      await welcomePage.goto();
    });

    await test.step(`the main heading should be "${welcomeHeading}"`, async () => {
      await welcomePage.expectHeading(welcomeHeading);
    });

    await test.step("the Contact Us link should be visible", async () => {
      await welcomePage.expectContactUsVisible();
    });
  });
});
