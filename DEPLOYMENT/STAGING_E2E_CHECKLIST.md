# Staging End-to-End Verification Checklist

Run this after `docker compose up -d --build` on the staging VPS. It verifies the
full stack (nginx TLS -> app -> PostgreSQL) and the V1 safety posture. Replace
`https://your-domain.com` with your staging domain. Use `-k` with curl only for
self-signed staging certs.

## 1. Infrastructure

- [ ] `docker compose ps` shows `db`, `app`, `nginx` all `Up` / healthy.
- [ ] `curl -k https://your-domain.com/api/health` returns `{"status":"ok","testMode":false}`.
- [ ] Plain HTTP redirects to HTTPS: `curl -kI http://your-domain.com` returns `301`.
- [ ] FFmpeg is present in the app image: `docker compose exec app ffmpeg -version`.
- [ ] PostgreSQL reachable: `docker compose exec db pg_isready -U aurapost`.

## 2. Security posture

- [ ] `GET /api/workspace` without a token returns `401`.
- [ ] The app refuses to boot if `JWT_SECRET` / `JWT_REFRESH_SECRET` / `ENCRYPTION_MASTER_KEY` are missing (confirm by inspecting logs on a misconfigured boot).
- [ ] Security headers present on responses (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).
- [ ] `X-Forwarded-Proto`/`X-Forwarded-For` are honored (login/cookies work over HTTPS with `TRUST_PROXY=1`).

## 3. Feature gates (must stay OFF in V1)

- [ ] Social publishing endpoints are blocked (`SOCIAL_CONNECTIONS_ENABLED=false`, `PUBLISHING_ENABLED=false`, `SMART_REPOST_ENABLED=false`, `PAID_ADS_ENABLED=false`).
- [ ] Live video rendering is locked unless explicitly enabled (`VIDEO_PROVIDER_LIVE=false`).

## 4. Core user journey

- [ ] Register a user + create a workspace.
- [ ] Log in; refresh token flow works; logout clears cookies.
- [ ] Product import from a public URL completes and appears in the import log.
- [ ] Market/analytics query returns bounded, non-fabricated results.
- [ ] Agent chat responds and can trigger an import/analysis flow.

## 5. Billing (sandbox)

- [ ] PayPal sandbox order/subscription round-trip completes and updates the plan.
- [ ] Points/credits ledger updates correctly after a simulated spend.
- [ ] Webhook endpoints receive and verify signatures (raw-body paths intact).

## 6. Persistence & recovery

- [ ] Data survives `docker compose restart`.
- [ ] `pg_dump` backup succeeds and restores cleanly to a scratch DB.
- [ ] Uploaded media persists in the `storage` volume across restarts.

> Any unchecked item is a release blocker. Record failures as GitHub issues
> labeled `staging`.
