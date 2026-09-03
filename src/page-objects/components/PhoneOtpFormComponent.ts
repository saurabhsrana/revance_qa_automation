import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Reusable loyalty phone + Get Code / OTP entry widget (Welcome → OTP).
 *
 * `#reva-phone` is a masked tel input (maxLength 14). The Svelte form model only
 * accepts the value after the mask formats it as `(XXX) XXX-XXXX`. If Get Code is
 * clicked while the DOM still shows raw digits (or a half-applied mask), the UI
 * can show "Phone number is required" or silently skip send-otp — that was the
 * completeprofile flake root cause.
 */
export class PhoneOtpFormComponent {
  constructor(private readonly page: Page) {}

  phoneInput(): Locator {
    return this.page
      .getByLabel(/phone number/i)
      .or(this.page.getByPlaceholder(/phone number/i))
      .or(this.page.locator('input#reva-phone, input[type="tel"]'))
      .first();
  }

  getCodeButton(): Locator {
    return this.page.getByRole("button", { name: /^(get code|verify)$/i });
  }

  otpInput(): Locator {
    return this.page
      .locator(
        '#reva-otp, input[autocomplete="one-time-code"], input[inputmode="numeric"]',
      )
      .first();
  }

  private phoneRequiredError(): Locator {
    return this.page.getByText(/phone number is required/i);
  }

  private async phoneDigits(): Promise<string> {
    return (await this.phoneInput().inputValue()).replace(/\D/g, "");
  }

  /** True only when display is fully masked and digits match. */
  private async isPhoneMaskCommitted(digits: string): Promise<boolean> {
    const value = await this.phoneInput().inputValue();
    return (
      value.replace(/\D/g, "") === digits &&
      /^\(\d{3}\) \d{3}-\d{4}$/.test(value)
    );
  }

  /** Type digits until the masked display and digit payload both match. */
  async enterPhoneNumber(phone: string): Promise<void> {
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      throw new Error(
        `Expected 10-digit phone, got "${phone}" (${digits.length} digits)`,
      );
    }

    const input = this.phoneInput();
    await input.waitFor({ state: "visible" });

    for (let attempt = 1; attempt <= 2; attempt++) {
      await input.click();
      await input.press("ControlOrMeta+A");
      await input.press("Backspace");
      // Key-by-key typing drives the mask; fill() often leaves an unmasked value.
      await input.pressSequentially(digits, { delay: attempt === 1 ? 30 : 60 });

      const committed = await expect
        .poll(async () => this.isPhoneMaskCommitted(digits), {
          timeout: 8_000,
          intervals: [100, 250, 500],
        })
        .toBeTruthy()
        .then(() => true)
        .catch(() => false);

      if (committed) break;

      if (attempt === 2) {
        const actual = await input.inputValue();
        throw new Error(
          `Phone mask did not commit. Expected "(XXX) XXX-XXXX" for ${digits}, got "${actual}".`,
        );
      }
    }

    // Blur commits the masked value into the Svelte model.
    await input.blur();
    await expect
      .poll(async () => this.isPhoneMaskCommitted(digits), {
        timeout: 5_000,
        message: "Phone mask/binding lost digits after blur",
      })
      .toBeTruthy();

    await expect(this.phoneRequiredError()).toBeHidden({ timeout: 5_000 });
    await expect(this.getCodeButton()).toBeEnabled({ timeout: 15_000 });
  }

  async clickGetCodeAndWaitForOtp(timeout = 60_000): Promise<void> {
    let digits = await this.phoneDigits();
    if (digits.length !== 10 || !(await this.isPhoneMaskCommitted(digits))) {
      if (digits.length !== 10) {
        throw new Error(
          `Cannot click Get Code: phone has ${digits.length} digits ("${await this.phoneInput().inputValue()}").`,
        );
      }
      await this.enterPhoneNumber(digits);
      digits = await this.phoneDigits();
    }

    try {
      await this.submitGetCodeAndAwaitOtp(timeout);
    } catch (err) {
      const validationVisible = await this.phoneRequiredError()
        .isVisible()
        .catch(() => false);
      const maybeUnsynced =
        validationVisible ||
        /waitForResponse|Timeout/i.test(
          err instanceof Error ? err.message : String(err),
        );

      if (!maybeUnsynced) throw err;

      // In-method recovery: re-commit mask/binding and click Get Code once more.
      await this.enterPhoneNumber(digits);
      await this.submitGetCodeAndAwaitOtp(timeout);
    }
  }

  private async submitGetCodeAndAwaitOtp(timeout: number): Promise<void> {
    const button = this.getCodeButton();
    await expect(button).toBeEnabled({ timeout: 15_000 });

    const sendOtp = this.page.waitForResponse(
      (res) =>
        /phone-number\/send-otp/i.test(res.url()) &&
        res.request().method() === "POST",
      { timeout },
    );

    const validation = this.phoneRequiredError()
      .waitFor({ state: "visible", timeout })
      .then(() => "validation" as const);

    await button.click();

    const winner = await Promise.race([
      sendOtp.then((r) => ({ kind: "response" as const, response: r })),
      validation.then(() => ({ kind: "validation" as const })),
    ]);

    if (winner.kind === "validation") {
      throw new Error(
        'Get Code rejected with "Phone number is required" (masked phone was not bound).',
      );
    }

    if (!winner.response.ok()) {
      const body = await winner.response.text().catch(() => "");
      throw new Error(
        `send-otp failed (${winner.response.status()} ${winner.response.url()}): ${body.slice(0, 300)}`,
      );
    }

    await this.waitForOtpStep(timeout);
  }

  private async waitForOtpStep(timeout: number): Promise<void> {
    await expect
      .poll(
        async () => {
          if (
            await this.phoneRequiredError()
              .isVisible()
              .catch(() => false)
          ) {
            throw new Error(
              'Stuck on welcome after Get Code: "Phone number is required".',
            );
          }
          if (
            await this.otpInput()
              .isVisible()
              .catch(() => false)
          )
            return "otp";
          if (/\/otp/i.test(this.page.url())) return "url";
          return false;
        },
        {
          timeout,
          message:
            "Timed out waiting for OTP field or /otp navigation after send-otp",
        },
      )
      .toMatch(/^(otp|url)$/);

    await this.otpInput().waitFor({ state: "visible", timeout: 15_000 });
  }
}
