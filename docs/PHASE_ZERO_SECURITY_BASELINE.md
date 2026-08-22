# Phase Zero — Security Baseline

This document records the first implementation slice of the AuraPost Agent-first rebuild.

## Scope

- Fail closed when JWT signing secrets are missing, weak, or identical.
- Remove fabricated PayPal order, capture, and subscription success paths.
- Require real PayPal sandbox credentials for sandbox testing.
- Remove publishing credit packs from the V1 catalog.
- Correct the Docker health check to use the implemented `/api/health` endpoint.
- Require an explicit PostgreSQL password in Docker Compose.
- Run package lifecycle scripts during Docker builds so dependency fixes are applied.
- Document V1 feature gates with publishing and social capabilities disabled.
- Remove the committed `.env` file from the active branch.

## Security invariants

1. A missing payment provider must produce an explicit failure, never a paid invoice or credits.
2. Fabricated `SANDBOX-ORDER-*` and `SANDBOX-SUB-*` identifiers are rejected.
3. JWT secrets must be configured, distinct, and at least 32 characters.
4. Production configuration must keep test and publishing features disabled for V1.
5. Secrets belong in a secret manager or local untracked `.env`, never in Git.

## Operator actions required

Removing `.env` from the current branch does not erase values from Git history. Before any deployment:

- Rotate JWT and encryption secrets.
- Rotate payment and AI-provider credentials if real values were ever committed.
- Configure repository secret scanning and push protection.
- Store deployment secrets in the selected cloud secret manager.

## Next Phase Zero slices

1. Refactor the existing HTTP scripts into a deterministic test suite and run it in CI.
2. Add production configuration validation at process startup.
3. Enforce V1 feature gates in API routes and the frontend.
4. Add persisted PayPal order metadata and amount/workspace verification before crediting balances.
5. Separate database migrations from application startup.
