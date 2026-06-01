#!/bin/bash
set -euo pipefail

archive="files/sources.zip"

# Build a fresh player archive containing only challenge sources.
rm -f "$archive"
zip -r "$archive" src/include src/client src/guest src/hypervisor

# Basic guardrail: reject obvious secret leakage in distributed sources.
if unzip -p "$archive" | grep -q "BZHCTF{"; then
	echo "[!] Refusing to publish archive: hardcoded flag pattern detected."
	exit 1
fi

echo "[+] Generated $archive"

