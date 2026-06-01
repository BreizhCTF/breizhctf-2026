#!/bin/bash
# Build script for ISwearItsAFeature Docker image
# Prerequisites: docker-buildx installed, /dev/kvm available
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CACHE_DIR="${SCRIPT_DIR}/.buildcache"

echo "[*] Creating buildx builder with insecure entitlement..."
docker buildx create --use --name insecure-builder \
    --buildkitd-flags '--allow-insecure-entitlement security.insecure' 2>/dev/null || true

echo "[*] Building Docker image (this will take a while on first run)..."
cd "${SCRIPT_DIR}"
docker buildx build \
    --allow security.insecure \
    --cache-from type=local,src="${CACHE_DIR}" \
    --cache-to   type=local,dest="${CACHE_DIR}",mode=max \
    --output type=docker \
    --progress=plain \
    -f Dockerfile-insecure \
    -t iswearitsafeature:latest \
    .

echo "[+] Build complete!"
echo ""
echo "Run with:"
echo "  cd src && docker compose up -d"
