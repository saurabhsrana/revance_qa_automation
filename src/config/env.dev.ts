/**
 * Dev environment URLs and non-secret defaults.
 * Credentials: set OCE_USERNAME / OCE_PASSWORD (or copy from .env.example → .env).
 */
export default {
  baseUrl: 'https://revance-loyalty-git-dev-revances-projects.vercel.app/',
  oceBaseUrl:
    'https://revance-oce--parcopy.sandbox.my.site.com/s/login/?ec=302&startURL=%2Fs%2F',
  oceBaseUrlnew: 'https://revance-oce--fulldev.sandbox.my.site.com/s/login/',
  oceUsername: process.env.OCE_USERNAME?.trim() || '',
  ocePassword: process.env.OCE_PASSWORD?.trim() || '',
  ocePractice: process.env.OCE_PRACTICE?.trim() || 'Pleasanton Dermatology',
  oceLocation: process.env.OCE_LOCATION?.trim() || 'Pleasanton - CA',
};
