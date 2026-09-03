import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

/**
 * Load `.env` from repo root (if present) and fail-fast when Loyalty BASE_URL cannot be resolved.
 * Call once from config index / hooks before reading env.*.ts credential fields.
 */
export function loadDotEnv(): void {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

/**
 * Ensures a Loyalty base URL is available via BASE_URL or env config after load.
 */
export function assertBaseUrlConfigured(baseUrl: string | undefined): string {
  const fromEnv = process.env.BASE_URL?.trim();
  const resolved = (fromEnv || baseUrl || "").replace(/\/$/, "");
  if (!resolved) {
    throw new Error(
      "BASE_URL is missing. Set BASE_URL in .env or baseUrl in src/config/env.{TEST_ENV}.ts",
    );
  }
  process.env.BASE_URL = resolved;
  return resolved;
}
