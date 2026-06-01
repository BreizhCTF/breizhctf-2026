#!/usr/bin/env bash
set -euo pipefail

: "${SPECULOS_API_PORT:=5000}"
: "${CHALLENGE_FLAG:=BZHCTF{l3dg3r_4pdu_m4st3r_bzh!}}"

SPECULOS_LOG=/tmp/speculos.log

speculos /app/app.elf --model stax --api-port "${SPECULOS_API_PORT}" --display headless >"${SPECULOS_LOG}" 2>&1 &
SPEC_PID=$!

cleanup() {
  if kill -0 "${SPEC_PID}" 2>/dev/null; then
    kill "${SPEC_PID}" || true
  fi
}
trap cleanup EXIT

python3 /app/inject_flag.py --url "http://127.0.0.1:${SPECULOS_API_PORT}" --flag "${CHALLENGE_FLAG}"

echo "[+] Speculos started on port ${SPECULOS_API_PORT}"

tail -n +1 -F "${SPECULOS_LOG}" &
TAIL_PID=$!

wait "${SPEC_PID}"
kill "${TAIL_PID}" 2>/dev/null || true
