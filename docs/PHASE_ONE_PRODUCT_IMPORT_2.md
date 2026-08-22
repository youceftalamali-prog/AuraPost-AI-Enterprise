# Phase 1.2 — Product Import 2.0

## Goal

Turn product import into a secure, truthful server-side capability that Aura can orchestrate. V1 imports real product data only; it does not invent products, publish content, schedule posts, or connect social accounts.

## Supported sources

- Shopify and Shopify custom domains using `/products/:slug`
- WooCommerce product routes
- Amazon
- AliExpress
- Alibaba
- eBay

Unknown providers fail with `UNSUPPORTED_PRODUCT_PROVIDER`. They are never silently treated as WooCommerce.

## Request boundary

Authenticated import requests are sanitized after workspace authorization and before credit checks or queue creation:

- the authorized workspace replaces any client workspace value;
- only `url`, `workspaceId`, and bounded `customPrompt` survive;
- browser-provided `rawHtml` and unknown fields are removed;
- invalid URLs fail before the import route performs paid work;
- an explicit `Idempotency-Key` is accepted, otherwise a deterministic workspace/URL/prompt key is derived;
- identical requests are replayed for 10 minutes on the same server instance, while concurrent duplicates return `IMPORT_REQUEST_IN_PROGRESS`.

The process-local idempotency cache protects normal retries and double submits. A PostgreSQL uniqueness record is still required before horizontally scaled production rollout.

## URL and network security

Every URL is normalized before extractor selection and checked again in the queue worker. All network requests started inside an extractor run in an AsyncLocalStorage-scoped safe-fetch runtime, including provider APIs, bootstrap pages, and description endpoints.

The runtime:

- accepts only HTTP and HTTPS;
- rejects credentials, non-standard ports, localhost, internal suffixes, single-label hosts, and private/reserved IPv4 and IPv6;
- resolves DNS before every request and redirect;
- follows at most five redirects and validates every destination;
- strips authorization, proxy authorization, cookies, and host headers across origins;
- allows GET and HEAD only;
- applies a 20-second request timeout;
- rejects responses larger than 16 MiB using both `Content-Length` and streamed byte counting;
- accepts only textual HTML, JSON, JavaScript/JSONP, and XML response types;
- removes browser-provided raw HTML from the extraction path.

DNS is revalidated immediately before each fetch. Production hardening should additionally pin the resolved public address at connection time to close the remaining DNS-rebinding race completely.

## API contract

Routes remain:

- `POST /api/import`
- `GET /api/import/status/:operationId`

A successful start response now always includes a top-level `operationId`, while preserving the existing nested `operation` object for backward compatibility.

## Credit lifecycle

The queue remains the authority for completion. Product credit is recorded on `completeImportSuccess`; failed attempts go through `completeImportFailure`. The idempotency boundary prevents normal duplicate submissions from creating a second operation on the same instance. Before multi-instance production, the operation, credit ledger write, and idempotency record must be committed in one PostgreSQL transaction.

## Acceptance checks

- Public Shopify/WooCommerce URLs select the intended extractor.
- Unsupported stores return a structured client error.
- SSRF-style local/private/reserved targets are rejected before network access.
- Redirect destinations, response types, timeouts, and byte limits are enforced centrally.
- Browser HTML is not passed to provider extractors.
- Duplicate requests are replayed or rejected without creating another operation.
- Import start responses expose `operationId` directly.
- Unit tests run through the existing `npm test`/`prebuild` gate.
- Build, TypeScript lint, Semgrep, and SonarCloud must pass before the PR leaves draft.
