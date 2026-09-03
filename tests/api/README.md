# tests/api

Reserved for **API-only** Playwright tests (request-context / no browser UI).

## Intent

This folder will hold the **API profile-enrollment** suite once the real Loyalty enrollment API contract is independently verified against backend / OpenAPI documentation.

## Starting point

Endpoint inventory (method + path + purpose only) lives in:

[`docs/api-enrollment-endpoints-reference.md`](../../docs/api-enrollment-endpoints-reference.md)

Rewrite from that inventory + a verified contract — do **not** revive deleted upstream-derived enrollment helpers.

## How to run (once populated)

```bash
npm run test:pw:api
# equivalent: npx playwright test --project=api
```

Until `*.spec.ts` files exist here, that command will report no tests.
