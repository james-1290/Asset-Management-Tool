#!/usr/bin/env bash
# Generate self-signed SAML SP signing key and certificate for development.
# Usage: ./scripts/generate-saml-keys.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="$SCRIPT_DIR/../apps/api-kt/src/main/resources/saml"

mkdir -p "$OUT_DIR"

echo "Generating SAML SP signing key pair..."

openssl req -x509 -newkey rsa:2048 \
  -keyout "$OUT_DIR/saml-signing-key.pem" \
  -out "$OUT_DIR/saml-signing-cert.pem" \
  -days 3650 \
  -nodes \
  -subj "/CN=asset-management-sp/O=AssetManagement/C=US"

# Convert RSA key to PKCS8 format (required by Java)
openssl pkcs8 -topk8 -nocrypt \
  -in "$OUT_DIR/saml-signing-key.pem" \
  -out "$OUT_DIR/saml-signing-key-pkcs8.pem"

mv "$OUT_DIR/saml-signing-key-pkcs8.pem" "$OUT_DIR/saml-signing-key.pem"

echo "Generated:"
echo "  Private key: $OUT_DIR/saml-signing-key.pem"
echo "  Certificate: $OUT_DIR/saml-signing-cert.pem"
echo ""
echo "These are for development only. In production, use proper certificates."
