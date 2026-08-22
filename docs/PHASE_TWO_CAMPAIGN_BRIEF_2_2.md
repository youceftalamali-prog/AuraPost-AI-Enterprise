# Phase 2.2 — Evidence-backed Campaign Brief

Aura converts persistent workflow context into a reviewable, versioned campaign brief before content generation.

## Evidence labels

Every supporting item is classified as `product_fact`, `market_evidence`, `user_input`, `ai_inference`, or `missing`. Missing evidence remains visibly missing; no market, audience, or profitability claim is fabricated.

## API

- `GET /api/agent/workflows/:workflowId/briefs/latest`
- `POST /api/agent/workflows/:workflowId/briefs/draft`
- `PATCH /api/agent/workflows/:workflowId/briefs/:briefId`

Routes use authenticated workspace/user context, parameterized SQL, immutable business versions for regenerated drafts, and optimistic `revision` checks for review edits.

## Approval gate

Approval requires objective, target market, target audience, value proposition, and primary angle. Profitability always remains `not_assessed` until landed cost, shipping, fees, ad cost, returns, and expected sale price exist.

## V1 boundary

Approval prepares Phase 2.3 content generation. It does not publish, schedule, connect social accounts, buy ads, or trigger Smart Repost.
