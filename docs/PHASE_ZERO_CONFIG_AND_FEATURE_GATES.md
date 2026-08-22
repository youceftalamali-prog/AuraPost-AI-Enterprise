# Phase Zero — Production Configuration and V1 Feature Gates

## Production startup policy

AuraPost now validates production configuration during startup through the security middleware import path. Production refuses to start when:

- `DATABASE_URL`, `APP_URL`, or `APP_BASE_URL` is missing.
- JWT or encryption secrets are missing or shorter than 32 characters.
- Access and refresh JWT secrets are identical.
- `TEST_MODE`, `AURAPOST_ENABLE_TEST_DATASET`, or `SHOPIFY_SYNC_TEST_MODE` is enabled.
- A publishing capability is enabled while `AURAPOST_RELEASE_VERSION=v1`.
- A boolean configuration value is not exactly `true` or `false`.

## V1 feature policy

The following capabilities default to disabled:

- Social account connections.
- Publishing and scheduling.
- Smart repost.
- Paid ads and dark posts.

The API gate runs before legacy route handlers. Old clients cannot bypass the V1 decision by calling publishing or Meta OAuth endpoints directly. Disabled routes return `FEATURE_DISABLED` with HTTP 404.

A safe read-only endpoint exposes the current release policy:

```text
GET /api/features
```

It returns only the release version and public feature booleans; it never returns secrets.

## Frontend transition

The current legacy navigation still contains publishing-era components. They cannot perform server actions because the API gate blocks them. Their visual removal is intentionally assigned to the Agent-first application shell rebuild rather than adding more conditional logic to the monolithic `src/App.tsx` that is scheduled for replacement.

## Remaining work

- Add integration tests that boot the API against PostgreSQL and assert the gated routes.
- Configure cloud secrets and `ALLOWED_ORIGINS` for the chosen deployment.
- Remove legacy publishing navigation during the Agent-first frontend phase.
- Keep all four feature flags disabled until platform licenses are approved for V2.
