#!/usr/bin/env bash
# Generate self-signed TLS certificates for staging/local use only.
# Never use these in production.
set -euo pipefail

CERT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/certs"
mkdir -p "$CERT_DIR"

openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout "$CERT_DIR/privkey.pem" \
  -out "$CERT_DIR/fullchain.pem" \
  -days 365 \
  -subj "/CN=localhost"

echo "Self-signed certificates written to $CERT_DIR"
