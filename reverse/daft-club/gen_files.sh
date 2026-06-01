#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

IMAGE="daft_club_gen:latest"

echo "[gen_files] Building Docker image..."
docker build -t "$IMAGE" src/

echo "[gen_files] Extracting validator binary from image..."
CONTAINER=$(docker create "$IMAGE")
docker cp "$CONTAINER:/usr/lib/cgi-bin/validator" /tmp/validator_extracted
docker rm "$CONTAINER" > /dev/null

echo "[gen_files] Packaging files/sources.tar.gz..."
mkdir -p files

STAGING=$(mktemp -d)
mkdir -p "$STAGING/DaftClub"


cp /tmp/validator_extracted "$STAGING/DaftClub/validator"
rm /tmp/validator_extracted

tar -czf files/sources.tar.gz -C "$STAGING" DaftClub
rm -rf "$STAGING"

echo "[gen_files] Done. Output: files/sources.tar.gz"
