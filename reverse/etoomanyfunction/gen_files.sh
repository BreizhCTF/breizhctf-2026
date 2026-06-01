#!/usr/bin/env bash
# Regenerates the files/ folder using Docker for a consistent build environment.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[*] Building Docker image…"
docker build -t etoomanyfunction-build "$SCRIPT_DIR/src"

echo "[*] Extracting challenge_stripped from container…"
CID=$(docker create etoomanyfunction-build)
docker cp "$CID:/build/challenge_stripped" "$SCRIPT_DIR/files/etoomanyfunction"
docker rm "$CID" > /dev/null

#echo "[*] Packaging files/sources.tar.gz…"
#tar -czf "$SCRIPT_DIR/files/sources.tar.gz" \
#    -C "$SCRIPT_DIR/src" \
#    generate.py main.c Dockerfile

echo "[+] Done. Distributable files:"
ls -lh "$SCRIPT_DIR/files/"
