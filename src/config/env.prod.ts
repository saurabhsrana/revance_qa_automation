/**
 * Prod/UAT environment URLs and non-secret defaults.
 * Credentials: set OCE_USERNAME / OCE_PASSWORD (or copy from .env.example → .env).
 * Note: Loyalty baseUrl currently matches QA Vercel origin until a dedicated prod URL is provided.
 */
export default {
  baseUrl: "https://revance-loyalty-env-qa-revances-projects.vercel.app",
  oceBaseUrl: "https://revance-oce--fulluat.sandbox.my.site.com/s/login/",
  oceBaseUrlnew: "https://revance-oce--fulluat.sandbox.my.site.com/s/login/",
  headlessUrl: "https://revance-oce--fulluat.sandbox.my.site.com/s/login/",
  cdpUrl: "https://revance-loyalty-env-qa-revances-projects.vercel.app/welcome",
  oceUsername: process.env.OCE_USERNAME?.trim() || "",
  ocePassword: process.env.OCE_PASSWORD?.trim() || "",
  ocePractice: process.env.OCE_PRACTICE?.trim() || "Dauwe Plastic Surgery",
  oceLocation: process.env.OCE_LOCATION?.trim() || "Dallas-TX-10707",
};
