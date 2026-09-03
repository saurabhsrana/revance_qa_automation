/**
 * Dynamic test-data helpers. Static values live in `src/data/constants.json`.
 */
import config from "../config";
import constants from "../data/constants.json";

/** UNIQUE → fresh 10-digit test phone so signup is not skipped for an existing account. */
export function resolveUniquePhone(phone: string): string {
  if (!/^unique$/i.test(phone.trim())) return phone;
  const suffix = Date.now().toString().slice(-9);
  return `9${suffix}`;
}

/** Keep john.doe@test.com unique per run using the last 8 phone digits. */
export function uniqueEmailForPhone(email: string, phone?: string): string {
  if (phone && /^john\.doe@test\.com$/i.test(email)) {
    return `john.doe+${String(phone).replace(/\D/g, "").slice(-8)}@test.com`;
  }
  return email;
}

/**
 * QA harness OTP — from src/config/env.{TEST_ENV}.ts (`otp`) with optional QA_TEST_OTP override.
 * SIGNUP_OTP is accepted as a legacy env alias.
 */
export function resolveTestOtp(): string {
  const otp = config.otp?.trim() || "";
  if (!otp) {
    throw new Error(
      "OTP is not configured. Set otp in src/config/env.{TEST_ENV}.ts or QA_TEST_OTP in .env.",
    );
  }
  return otp;
}

/** Welcome page expected heading (from constants.json). */
export const welcomeHeading = constants.welcome.heading;

/** Former completeprofile Examples row — static payload from constants.json. */
export const profileDataSets = constants.profileDataSets;
