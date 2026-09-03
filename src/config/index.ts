import { assertBaseUrlConfigured, loadDotEnv } from "./env";
import type { AppEnvConfig } from "./types";

loadDotEnv();

const envName = (process.env.TEST_ENV || process.env.ENV || "qa").toLowerCase();
const resolvedEnv = envName === "qa" || envName === "prod" ? envName : "dev";

const rawConfig = require(`./env.${resolvedEnv}`).default as AppEnvConfig;

const baseUrl = assertBaseUrlConfigured(
  process.env.BASE_URL?.trim() || rawConfig.baseUrl,
);

const otp =
  process.env.QA_TEST_OTP?.trim() ||
  process.env.SIGNUP_OTP?.trim() ||
  rawConfig.otp?.trim() ||
  "";

const config: AppEnvConfig = {
  ...rawConfig,
  baseUrl,
  otp,
};

export default config;
