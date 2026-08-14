# Phase 1.3 — Market Intelligence 2.0

## Objective

Aura presents market evidence that is live, attributable, and honest about missing coverage. The V1 interface must never convert missing credentials, empty provider responses, or AI guesses into numeric market or profitability claims.

## Changes

- Replaced synthetic DataForSEO fallbacks with a typed live-data service.
- Added bounded multilingual query validation for Arabic, French, and English terms.
- Added fixed-origin provider requests, redirect rejection, a 20-second timeout, and an 8 MiB response limit.
- Added deterministic demand, competition-risk, commercial-intent, trend, opportunity, and confidence scoring.
- Opportunity results now state that profitability requires landed cost, fees, shipping, and return-rate evidence.
- Competitors are limited to listings with a real title and destination URL; unavailable prices remain `null`.
- Trend and country recommendations are shown only when returned by the live provider.
- Replaced the legacy multi-section demo dashboard with an Aura-led market workspace and removed sample-data controls from the active V1 path.
- Added AR/FR/EN interface copy and partial-result handling.

## Evidence policy

- `liveDataAvailable: false` means no numeric conclusion is rendered.
- No hard-coded demand, margin, competitor, trend, persona, or pricing values are used.
- AI prose is not treated as market measurement.
- Provider credentials and raw provider payloads are not returned to the browser.

## Remaining production work

- Persist normalized market snapshots with provider timestamp and request fingerprint.
- Add landed-cost inputs before enabling profitability or margin scoring.
- Add PostgreSQL usage metering and a workspace-level cache to control DataForSEO cost.
- Expand verified marketplace coverage only after provider contract tests are available.
