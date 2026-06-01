#!/bin/bash
# Creates an AVD snapshot with both apps pre-installed
# Runs during Docker build (requires --security=insecure for /dev/kvm)
set -e

echo "[SNAPSHOT] Creating AVD..."
yes '' | avdmanager create avd -n "${AVD_NAME}" -k "${AVD_SYSTEM_IMAGE}"

echo "[SNAPSHOT] Booting emulator..."
emulator -avd "${AVD_NAME}" -no-window -no-audio -no-boot-anim -no-snapshot -wipe-data &
EMU_PID=$!
adb wait-for-device shell 'while [ -z "$(getprop sys.boot_completed)" ]; do sleep 1; done'
echo "[SNAPSHOT] Boot complete"

echo "[SNAPSHOT] Restarting adbd as root..."
adb root
sleep 2
adb wait-for-device

sleep 3

echo "[SNAPSHOT] Installing BzhMessenger APK..."
adb install -r -g /challenge/app.apk

echo "[SNAPSHOT] Installing VaultPass APK..."
adb install -r -g /challenge/vaultpass.apk

sleep 3

echo "[SNAPSHOT] Granting storage permissions..."
adb shell appops set com.breizhctf.iswearitsafeature MANAGE_EXTERNAL_STORAGE allow
adb shell appops set com.breizhctf.vaultpass MANAGE_EXTERNAL_STORAGE allow

echo "[SNAPSHOT] Setting up VaultPass private storage..."
adb shell mkdir -p /data/data/com.breizhctf.vaultpass/files
adb shell "echo 'PLACEHOLDER_FLAG' > /data/data/com.breizhctf.vaultpass/files/secret.key"
VAULTPASS_UID=$(adb shell stat -c '%u' /data/data/com.breizhctf.vaultpass/)
adb shell chown "${VAULTPASS_UID}:${VAULTPASS_UID}" /data/data/com.breizhctf.vaultpass/files/secret.key
adb shell chmod 600 /data/data/com.breizhctf.vaultpass/files/secret.key

echo "[SNAPSHOT] Placing VaultPass backup APK on /sdcard/..."
adb push /challenge/vaultpass.apk /sdcard/Download/vaultpass-backup.apk

sleep 2

echo "[SNAPSHOT] Saving snapshot..."
adb emu avd snapshot save post_setup

echo "[SNAPSHOT] Shutting down..."
kill "$EMU_PID" 2>/dev/null || true
wait "$EMU_PID" 2>/dev/null || true
sleep 2

echo "[SNAPSHOT] Done"
