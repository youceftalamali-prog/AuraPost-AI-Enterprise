# Phase Zero — Test and CI Baseline

This slice replaces process-exiting HTTP scripts with deterministic suites and adds a dependency-free security gate to the existing CI build.

## Automated security gate

`npm test` uses Node's built-in test runner to verify repository security invariants without starting external services:

- JWT configuration fails closed and no longer generates process-local secrets.
- PayPal contains no fabricated successful order or capture path.
- Publishing credit packs remain outside V1.
- Docker uses the implemented health endpoint.
- Docker Compose requires an explicit PostgreSQL password.
- V1 publishing and production test flags remain disabled in the environment template.

`npm run build` has a `prebuild` gate that runs these checks automatically. The existing GitHub build job therefore fails when a Phase Zero invariant regresses.

## API suite

The previous standalone scripts now use `node:test`, strict assertions, shared HTTP timeouts, response headers, and structured JSON handling. Run them against a started AuraPost instance with:

```bash
TEST_URL=http://127.0.0.1:3000 npm run test:api
```

They cover health/readiness, request IDs, authentication validation, authorization boundaries, removed diagnostics, and production test-mode protections.

## GitHub workflow limitation

The current GitHub integration was denied permission to modify `.github/workflows/ci.yml`. Therefore the service-independent security gate is connected through the existing build job. A repository-admin action must grant workflow permission before PostgreSQL-backed API tests can receive a dedicated CI job.

## Next quality steps

- Add a PostgreSQL service and run `test:api` in GitHub Actions.
- Add runtime unit tests after standardizing the TypeScript test loader.
- Add billing amount/workspace/idempotency integration tests.
- Add repository fixtures, migration tests, and Agent end-to-end coverage.
- Remove obsolete Jest dependencies after regenerating `package-lock.json`.
