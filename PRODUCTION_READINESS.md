# AuraPost AI: Production Readiness Checklist

**Deployment Target:** Google Cloud Run, GKE, or Standard VM Architectures  
**Prepared By:** Senior DevOps & Security Architect  
**Status:** COMPLETE (Production Gatekeeping Approved with Action Items)  

---

## 1. Production Infrastructure Matrix

To transition AuraPost AI from a development sandbox to a highly available, enterprise-ready production environment, configure the following target setup:

```text
       [DNS / SSL Target (Cloudflare / GCP HTTPS Load Balancer)]
                                  |
                                  v
                    [Google Cloud Run Containers]
              +-------------------+-------------------+
              | Container Inst 1  | Container Inst 2  |
              +---------+---------+---------+---------+
                        |                   |
                        +---------+---------+
                                  |
                                  v
              [Google Cloud SQL PostgreSQL Database]
```

---

## 2. Comprehensive Readiness Checklist

### A. Environment Secret Guardrails
* [ ] **`ENCRYPTION_MASTER_KEY`:** Generate and configure a unique 32-character or longer string. Ensure the development fallback key is disabled.
* [ ] **`GEMINI_API_KEY`:** Configure a live Gemini API Key in the environment secrets. Verify it has access to the latest generative models.
* [ ] **`STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`:** Configure live Stripe production credentials to replace the billing sandbox.
* [ ] **`META_APP_ID` & `META_APP_SECRET`:** Configure official Meta Developer App credentials to replace the social sandbox.
* [ ] **`NODE_ENV`:** Set explicitly to `production` in all deployment manifests. This disables local developer debugging assets and enables optimal production builds.

### B. Scalable Database Provisioning
* [ ] Migrate database schemas from local `sql.js` (SQLite) to Google Cloud SQL (PostgreSQL).
* [ ] Configure persistent database connection pooling (using tools like `pg-pool`) to prevent database socket exhaustion during peak loads.
* [ ] Set up automated database backup schedules with a retention period of at least 7 to 30 days.

### C. Containerized Build & Bundle Optimization
* [ ] Verify that `npm run build` bundles client-side assets cleanly into `/dist` with zero compilation warnings.
* [ ] Set up an optimized, multi-stage Docker build pipeline:
  ```dockerfile
  # Stage 1: Build
  FROM node:20-alpine AS builder
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npm run build

  # Stage 2: Runtime
  FROM node:20-alpine
  WORKDIR /app
  ENV NODE_ENV=production
  COPY package*.json ./
  RUN npm ci --only=production
  COPY --from=builder /app/dist ./dist
  EXPOSE 3000
  CMD ["npm", "start"]
  ```

### D. Telemetry, Monitoring, and Logging
* [ ] Integrate logging streams (stdout/stderr) with centralized cloud monitors (like Google Cloud Logging, Datadog, or Elasticsearch).
* [ ] Configure Prometheus metrics endpoints or Datadog APM agents to track runtime performance (memory, CPU, Event Loop delay, active database connections).
* [ ] Set up alert triggers to immediately notify DevOps on-call teams if API endpoints return sustained `5xx` error spikes.

### E. Security Hardening
* [ ] Enable HTTP Strict Transport Security (HSTS) headers via secure middleware (like `helmet`).
* [ ] Set up a Content Security Policy (CSP) to restrict client-side scripts to trusted CDN domains, mitigating Cross-Site Scripting (XSS) vectors.
* [ ] Use Cloudflare, AWS WAF, or GCP Cloud Armor to establish DDoS protection and rate limit incoming traffic.
