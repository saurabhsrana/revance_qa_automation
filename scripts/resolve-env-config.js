/**
 * Reads baseUrl from src/config/env.{TEST_ENV}.ts for CommonJS tooling
 * (allurerc.cjs, allure-prepare-metadata.js) without a TypeScript runtime.
 */
const fs = require("node:fs");
const path = require("node:path");

function resolveEnvName(envName = process.env.TEST_ENV || process.env.ENV || "qa") {
  const normalized = String(envName).toLowerCase();
  return normalized === "qa" || normalized === "prod" ? normalized : "dev";
}

function readEnvFile(envName) {
  const resolved = resolveEnvName(envName);
  const filePath = path.join(
    __dirname,
    "..",
    "src",
    "config",
    `env.${resolved}.ts`,
  );
  const content = fs.readFileSync(filePath, "utf8");
  const baseUrl =
    content.match(/baseUrl:\s*"([^"]+)"/)?.[1]?.replace(/\/$/, "") || "";
  const otp = content.match(/otp:\s*"([^"]+)"/)?.[1] || "";
  return { baseUrl, otp, envName: resolved };
}

function resolveBaseUrl() {
  const fromEnv = process.env.BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return readEnvFile(process.env.TEST_ENV).baseUrl;
}

function resolveOtp() {
  const fromEnv =
    process.env.QA_TEST_OTP?.trim() || process.env.SIGNUP_OTP?.trim() || "";
  if (fromEnv) return fromEnv;
  return readEnvFile(process.env.TEST_ENV).otp;
}

module.exports = {
  readEnvFile,
  resolveBaseUrl,
  resolveOtp,
};
