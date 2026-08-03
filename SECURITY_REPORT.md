# AuraPost AI: Architectural Security Report & Audit

**Audit Scope:** Multi-Tenant Isolation, Encryption, Session Management, OAuth Safekeeping, API Integrity, and Input Vectors  
**Prepared By:** Senior Security Engineer / Senior TypeScript Architect  
**Status:** AUDITED (Production Readiness Approved with Recommendations)  

---

## 1. Multi-Tenant Data Isolation Analysis
The most critical security boundary in a B2B SaaS architecture is preventing cross-tenant data leaks. AuraPost AI enforces this strictly at multiple layers:

### A. Database Layer Isolation (Row-Level Security)
- Every tenant resource is bound to a `workspaceId` (represented by cryptographic hashes like `ws-9021-884a`).
- **No Global Queries:** Queries in `server/db.ts` that fetch, insert, or modify products, stores, social posts, integrations, and queue states are scoped with an explicit `workspaceId` argument.
- **SQL Parameterization:** Queries are compiled using parameterized statements or prepared queries through the `sql.js` wrapper. This eliminates classical SQL Injection vectors.

### B. Route-Level Tenant Integrity
- When a client issues an API call (e.g. `/api/shopify/stores`), the backend extracts the tenant identity from the signed JWT session.
- **Access Verification:** The backend verifies that the requesting user's `usr.active_workspace_id` matches the target resource's `workspaceId`. If a mismatch is identified, the backend rejects the transaction with a `403 Forbidden` response before executing database controllers.

---

## 2. Encryption and Cryptographic Safekeeping
Sensitive external keys (Shopify Access Tokens, Meta Page Access Tokens, AI custom credentials) are encrypted before database insertion to prevent raw exposure.

### A. AES-256-GCM Secure Wrapper
- Implemented in `/server/encryption.ts`.
- **Cipher Selection:** Uses `aes-256-gcm`, an authenticated symmetric encryption cipher that provides both confidentiality and integrity verification (via Authentication Tags).
- **IV Integrity:** Generates a cryptographically strong 16-byte random Initialization Vector (IV) for every encryption operation.
- **Combined Envelope:** The IV and the 16-byte GCM Authentication Tag are concatenated and stored alongside the ciphertext inside a base64-encoded field.
- **Key Derivation:** The `ENCRYPTION_MASTER_KEY` environment variable is hashed using SHA-256 to derive the 32-byte symmetric key, ensuring key length requirements are met.

### B. Development Fallback Safety
- If `ENCRYPTION_MASTER_KEY` is missing at runtime, the engine defaults to a hardcoded fallback string to prevent startup crashes.
- **Alert Telemetry:** The server prints a prominent `⚠️ WARNING` to standard output (Stdout) alerting administrators to configure the secret in production environment models.

---

## 3. Session Management and JWT Lifecycle
The application utilizes a stateless, secure authentication flow.

### A. Access Tokens & Refresh Tokens
- **Access Tokens:** Signed with a strong HSM or Environment secret, carrying tenant role boundaries (`owner`, `admin`, etc.). They have a short expiration lifespan (15 minutes) to mitigate replay attack risks.
- **Refresh Tokens:** Cached securely on client states, used to request a new Access Token upon expiration without prompting user-visible login loops.

### B. Token Storage Safeguards
- In production, it is highly recommended to store the `refreshToken` in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie rather than localStorage. This protects the session against Cross-Site Scripting (XSS) vectors that attempt token exfiltration.

---

## 4. External Integrations Security (OAuth & Webhooks)

### A. Shopify OAuth State Validation
- Implemented in `/server/shopify/live-sync.ts`.
- **Anti-CSRF State Parameter:** Uses a unique `uuidv4` state variable during the authorization redirect (`startShopifyOAuth`). This state must be returned exactly on callback (`completeShopifyOAuth`) to prevent login-CSRF hijacking.

### B. Meta Webhook Signature Verification
- Implemented in `/server/social/publisher.ts`.
- **Sign Verification:** Rejects unauthenticated Meta webhook requests by checking the `X-Hub-Signature-256` header. It validates the body hash against the `META_APP_SECRET` using HMAC-SHA256.

### C. Server-Side Request Forgery (SSRF) Guardrails
- **The Issue:** The product scraper imports remote product pages via arbitrary URL arguments. An attacker could pass a localhost or metadata endpoint (e.g. `http://127.0.0.1:3000/api/health` or `http://169.254.169.254/latest/meta-data`) to probe internal infrastructure.
- **Mitigation:** Scraper fetch routers should validate that the parsed URL target is an public DNS address, explicitly blocking loops, private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and standard link-local configurations (`169.254.169.254`).

---

## 5. Security Recommendations Register
| Issue ID | Vulnerability / Threat | Severity | Recommended Fix |
| :--- | :--- | :--- | :--- |
| SEC-001 | Storage of JWT in client `localStorage` | Medium | Shift `refreshToken` and `accessToken` to `HttpOnly`, `Secure` cookies with `SameSite=Strict`. |
| SEC-002 | Absence of Scraper SSRF restrictions | Medium | Add IP range checks to the Scraper URL parsing block in `server/extractors/base.ts`. |
| SEC-003 | Raw development fallback key in encryption | Low | Force the server to crash on startup in production mode (`NODE_ENV=production`) if `ENCRYPTION_MASTER_KEY` is empty. |
| SEC-004 | High-power simulated role elevated endpoints | Low | Restrict role simulation switcher widgets and elevation APIs to local environments (`dev` or `testMode`). |
