# TLS Certificates

`nginx` (see `../nginx.conf` and `../docker-compose.yml`) expects two files in
this directory, mounted read-only at `/etc/nginx/certs`:

- `fullchain.pem` — full certificate chain
- `privkey.pem` — private key

These files are intentionally **not committed** (`../.gitignore` ignores
`certs/*.pem` and `certs/*.key`). Provide them per environment.

## Production

Use a real certificate (Let's Encrypt / certbot or your provider), then place the
files here as `fullchain.pem` and `privkey.pem`, or mount them at
`/etc/nginx/certs`.

## Staging / local (self-signed)

```bash
bash scripts/generate-dev-certs.sh
```

Self-signed certificates trigger browser warnings and must never be used in
production.
