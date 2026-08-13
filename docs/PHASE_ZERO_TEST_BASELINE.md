# Phase Zero — Test and CI Baseline

This slice replaces process-exiting HTTP scripts with deterministic suites based on Node's built-in test runner and `tsx`.

## Automated security gate

`npm test` executes isolated unit tests for the Phase Zero security invariants:

- Missing, weak, or identical JWT secrets are rejected.
- Valid access and refresh secrets create separate verifiable tokens.
- Unconfigured PayPal cannot create a successful order.
- Fabricated PayPal sandbox IDs are rejected before a provider request.
- Publishing credit packs remain outside V1.

`npm run build` has a `prebuild` gate that runs these tests automatically. Because the existing GitHub build job already runs `npm run build`, these security tests are now enforced by CI without depending on external services.

## API suite

The previous standalone scripts now use `node:test`, strict assertions, shared HTTP timeouts, response headers, and structured JSON handling. Run them against a started AuraPost instance with:

```bash
TEST_URL=http://127.0.0.1:3000 npm run test:api
```

They cover health/readiness, request IDs, authentication validation, authorization boundaries, removed diagnostics, and production test-mode protections.

## GitHub workflow limitation

The current GitHub integration can update repository code but was denied permission to modify `.github/workflows/ci.yml`. Therefore this slice wires service-independent security tests through the existing build job. A later repository-admin action must grant workflow permission before PostgreSQL-backed API tests can receive a dedicated CI job.

## Next quality steps

- Add a PostgreSQL service and run `test:api` in GitHub Actions.
- Add billing amount/workspace/idempotency integration tests.
- Add repository fixtures and migration tests.
- Add Agent workflow end-to-end coverage.
- Remove obsolete Jest dependencies after regenerating `package-lock.json`.
