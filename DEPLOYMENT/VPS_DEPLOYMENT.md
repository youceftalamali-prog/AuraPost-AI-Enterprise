# VPS Deployment (Self-Hosted, Recommended)

This is the recommended path for AuraPost AI. It uses the repository's own
`Dockerfile`, `docker-compose.yml` and `nginx.conf`, so staging and production
are identical. It is the most cost-effective option for the CPU/RAM-heavy video
(FFmpeg) workloads.

Tested on Ubuntu 22.04/24.04. A 4 vCPU / 8 GB RAM instance (e.g. Hetzner CPX31)
is a good starting point for staging and early production.

---

## 1. Provision the server

1. Create an Ubuntu 22.04+ VPS.
2. Point your domain's `A` record at the server's public IP.
3. Open ports `22`, `80` and `443` in the provider firewall.

## 2. Install Docker + Compose plugin

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"   # log out/in afterwards
docker --version && docker compose version
```

## 3. Clone the repository

```bash
git clone https://github.com/youceftalamali-prog/AuraPost-AI-Enterprise.git
cd AuraPost-AI-Enterprise
git checkout rebuild/agent-platform
```

## 4. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```bash
NODE_ENV=production
TEST_MODE=false
# Behind nginx, trust the first proxy hop:
TRUST_PROXY=1
# Public HTTPS URLs:
APP_URL="https://your-domain.com"
APP_BASE_URL="https://your-domain.com"
# Secrets (generate strong values):
JWT_SECRET="$(openssl rand -base64 48)"
JWT_REFRESH_SECRET="$(openssl rand -base64 48)"
ENCRYPTION_MASTER_KEY="$(openssl rand -base64 32)"
```

Also export a database password for Compose (used by both `db` and `app`):

```bash
echo 'POSTGRES_PASSWORD=change-me-strong' >> .env
```

> The `db` and `app` services read `POSTGRES_PASSWORD` from the shell/`.env`.
> The app's `DATABASE_URL` is assembled from it automatically in
> `docker-compose.yml`. Add provider keys (OpenRouter, HeyGen, ElevenLabs,
> DataForSEO, PayPal, Stripe, ...) incrementally — each unset feature fails
> loudly rather than fabricating results.

## 5. TLS certificates

**Production** — use a real certificate. Easiest with a one-off certbot run, then
copy the results into `certs/`:

```bash
sudo apt-get install -y certbot
sudo certbot certonly --standalone -d your-domain.com
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem certs/fullchain.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem  certs/privkey.pem
sudo chown "$USER" certs/*.pem
```

**Staging / quick test** — self-signed (browser warning expected):

```bash
bash scripts/generate-dev-certs.sh
```

## 6. Bring the stack up

```bash
docker compose up -d --build
docker compose ps
```

This starts three services: `db` (PostgreSQL 16), `app` (the built image with
FFmpeg) and `nginx` (TLS termination + reverse proxy on 80/443). The database
schema is applied automatically on first boot.

## 7. Smoke test

```bash
curl -k https://your-domain.com/api/health
# -> {"status":"ok","testMode":false}

curl -k -o /dev/null -w "%{http_code}\n" https://your-domain.com/api/workspace
# -> 401   (auth is enforced)
```

Run the full end-to-end checklist in `STAGING_E2E_CHECKLIST.md`.

## 8. Updating a running deployment

```bash
git pull
bash scripts/deploy.sh
```

## 9. Logs, backups, teardown

```bash
# Logs
docker compose logs -f app
docker compose logs -f nginx

# Database backup / restore
docker compose exec -T db pg_dump -U aurapost aurapost > backup_$(date +%F).sql
cat backup.sql | docker compose exec -T db psql -U aurapost -d aurapost

# Stop / remove (keeps named volumes)
docker compose down
```

## 10. Certificate renewal

Let's Encrypt certs last 90 days. Re-run the certbot step and copy the new files
into `certs/`, then reload nginx:

```bash
docker compose exec nginx nginx -s reload
```
