#!/bin/bash
set -e

IMAGE="ghcr.io/ledgerhq/ledger-app-builder/ledger-app-dev-tools:latest"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/src/app_bzh_ctf"

docker run --rm --privileged \
    -v "/dev/bus/usb:/dev/bus/usb" \
    -v "$APP_DIR:/app" \
    "$IMAGE" \
    bash -c '
        set -e
        echo "Building target"
        make BOLOS_SDK=$STAX_SDK
        echo "Installing test dependencies"
        pip install --break-system-packages -r tests/standalone/requirements.txt -q
        echo "Running tests"
        pytest tests/standalone/ --device stax --tb short -v
    '

echo "Copying binary to files/"
mkdir -p "$SCRIPT_DIR/files"
cp "$APP_DIR/bin/app.elf" "$SCRIPT_DIR/files/"
cp "$APP_DIR/bin/app.elf" "$SCRIPT_DIR/src/"
