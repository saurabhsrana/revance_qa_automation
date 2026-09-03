/**
 * Dynamic test-data helpers. Static values live in `src/data/constants.json`.
 */
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

/** Prefer SIGNUP_OTP from env when set (CI / .env). */
export function verificationCodeFromEnv(fallback: string): string {
  return process.env.SIGNUP_OTP?.trim() || fallback;
}

/** Welcome page expected heading (from constants.json). */
export const welcomeHeading = constants.welcome.heading;

/** Former completeprofile Examples row — static payload from constants.json. */
export const profileDataSets = constants.profileDataSets;
