# Phase 1.2 — Product Import 2.0

## Goal

Turn product import into a secure, truthful server-side capability that Aura can orchestrate. V1 imports real product data only; it does not invent products, publish content, schedule posts, or connect social accounts.

## Supported sources in this slice

- Shopify and Shopify custom domains using `/products/:slug`
- WooCommerce product routes
- Amazon
- AliExpress
- Alibaba
- eBay

Unknown providers fail with `UNSUPPORTED_PRODUCT_PROVIDER`. They are never silently treated as WooCommerce.

## Security boundary

Every product URL is normalized before an extractor is selected and checked again in the queue worker before a network request. The policy:

- accepts only HTTP and HTTPS;
- rejects embedded credentials and non-standard ports;
- rejects localhost, internal host suffixes, single-label internal names, private/reserved IPv4, and private/reserved IPv6;
- resolves DNS and rejects any private or reserved answer;
- limits URLs to 2,048 characters;
- limits custom instructions to 1,000 characters;
- ignores browser-supplied raw HTML, so extraction is based only on the verified public URL;
- applies a dedicated import rate limit.

Redirect handling and response byte/content-type limits must remain fail-closed in each provider adapter. A shared safe-fetch implementation is the next backend hardening slice.

## API compatibility

The current route remains:

- `POST /api/import`
- `GET /api/import/status/:operationId`

The frontend must accept the current operation identifier at `operation.id` while the server contract is migrated to also return a top-level `operationId`.

## Acceptance checks

- Public Shopify/WooCommerce URLs select the intended extractor.
- Unsupported stores return a structured client error.
- SSRF-style local/private/reserved targets are rejected.
- Browser HTML is not passed to provider extractors.
- Unit tests run through the existing `npm test`/`prebuild` gate.
- Build, TypeScript lint, Semgrep, and SonarCloud must pass before the PR leaves draft.
