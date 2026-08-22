# Phase 1 — Agent-First Shell

## Goal

Replace the module-heavy portal navigation with one guided Aura workspace for V1. The customer starts from a product URL, image, saved product, written description, or template; Aura then opens the appropriate implementation surface.

## Implemented in this slice

- Replaced the logged-in tab grid with an Agent-first home.
- Added templates directly below the Aura prompt across jewelry, fashion, beauty, electronics, home, fitness, food, and universal categories.
- Added source modes for URL, image, saved product, and description.
- Kept the existing product import, catalog, analysis, image, content, and video implementations behind the guided workflow.
- Removed publishing, calendar, and social-connections entry points from the V1 shell.
- Added Arabic, French, and English shell controls, with Arabic as the initial locale.
- Added a typed client for `GET /api/features` with a fail-closed V1 fallback.
- Preserved a direct settings control as a workspace utility, not a production workflow module.

## Authentication transport

- Access and refresh JWTs are issued only as HttpOnly cookies.
- Production cookies are `Secure` and all authentication cookies use `SameSite=Strict`.
- The short-lived access cookie is limited to `/api`; the refresh cookie is limited to `/api/auth`.
- Login and refresh responses no longer expose JWT values to browser JavaScript.
- The frontend no longer persists authentication tokens in Web Storage.
- Bearer tokens remain accepted for non-browser API clients and automated tests.

## V1 workflow

1. Select a template or describe the campaign.
2. Provide a product URL, product image, saved product, or written description.
3. Import or select the product.
4. Analyze product and market fit.
5. Generate copy, images, and video.
6. Review and download assets.

Publishing and social-license capabilities remain unavailable in this release.

## Deliberate limitations

- The shell currently orchestrates existing implementation screens locally; the server-side Aura planning/execution engine is a later phase.
- Template selection is retained as shell context and displayed throughout the workflow. Scene-graph rendering is not implemented in this slice.
- Existing implementation screens still contain English-only copy; this slice establishes locale selection and translates the new shell first.
- Live provider validation still requires real test credentials and network access.
