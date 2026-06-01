#!/bin/bash
# Entrypoint: starts Flask server, boots AVD from snapshot, writes flag, runs bot
set -e

echo "[*] I swear it's a feature! - BreizhCTF 2026"

# 1. Start Flask server in background
# Port 80: the APK's ApiConfig.BASE_URL points to http://forum.ctf.bzh
# CoreDNS sidecar resolves forum.ctf.bzh -> 10.0.2.2 (container localhost from emulator)
echo "[SERVER] Starting Flask server on port 80..."
cd /challenge/server
python3 app.py &
SERVER_PID=$!
sleep 2

until curl -sf http://127.0.0.1:80/ >/dev/null 2>&1; do
    echo "[SERVER] Waiting for Flask..."
    sleep 1
done
echo "[SERVER] Flask is up (PID ${SERVER_PID})"

# 2. Start emulator from snapshot
echo "[AVD] Starting emulator from snapshot..."
emulator -avd "${AVD_NAME}" \
    -port 5554 \
    -no-window \
    -no-audio \
    -no-boot-anim \
    -dns-server 127.0.0.1 \
    -snapshot post_setup &

echo "[AVD] Waiting for boot..."
adb wait-for-device
until adb shell getprop sys.boot_completed 2>/dev/null | grep -q "1"; do
    sleep 2
done
echo "[AVD] Emulator ready"

sleep 3

# 3. Write flag to VaultPass private storage
# The snapshot has a placeholder; we overwrite with the real flag per deployment
echo "[AVD] Writing flag to VaultPass private storage..."
VAULTPASS_UID=$(adb shell stat -c '%u' /data/data/com.breizhctf.vaultpass/)
adb shell "echo -n '${FLAG}' > /data/data/com.breizhctf.vaultpass/files/secret.key"
adb shell chown "${VAULTPASS_UID}:${VAULTPASS_UID}" /data/data/com.breizhctf.vaultpass/files/secret.key
adb shell chmod 600 /data/data/com.breizhctf.vaultpass/files/secret.key
echo "[AVD] Flag written to secret.key"

# 4. Verify the app can reach the server
echo "[AVD] Testing connectivity from emulator to server..."
adb shell "ping -c 1 10.0.2.2" 2>/dev/null || echo "[AVD] ping failed (expected if no ping binary)"

# 5. Run the bot (blocks forever, polling channels)
echo "[BOT] Starting bot..."
export SERVER_HOST="127.0.0.1"
exec /challenge/bot.sh
