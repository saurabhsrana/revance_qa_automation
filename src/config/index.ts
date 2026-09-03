import { assertBaseUrlConfigured, loadDotEnv } from "./env";

loadDotEnv();

const envName = (
  process.env.TEST_ENV ||
  process.env.ENV ||
  "qa"
).toLowerCase();
const resolvedEnv = envName === "qa" || envName === "prod" ? envName : "dev";

// eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic env file selection
const config = require(`./env.${resolvedEnv}`).default as {
  baseUrl: string;
  oceBaseUrl?: string;
  oceBaseUrlnew?: string;
  oceUsername?: string;
  ocePassword?: string;
  ocePractice?: string;
  oceLocation?: string;
  headlessUrl?: string;
  cdpUrl?: string;
};

assertBaseUrlConfigured(config.baseUrl);

export default config;
