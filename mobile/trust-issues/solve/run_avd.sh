#!/usr/bin/env bash
# run_avd.sh — Trust Issues : AVD rootable + frida-server + install APK
#
# Usage : ./run_avd.sh
# Prérequis : Android SDK (cmdline-tools, platform-tools), frida client (`pip install frida-tools`)
set -euo pipefail

# ---- Config -------------------------------------------------------------
ANDROID_SDK="${ANDROID_SDK:-$HOME/android-sdk}"
AVD_NAME="${AVD_NAME:-trust_issues}"
API_LEVEL="${API_LEVEL:-34}"
ARCH="${ARCH:-x86_64}"
IMAGE="system-images;android-${API_LEVEL};google_apis;${ARCH}"  # google_apis = rootable (PAS playstore)
DEVICE_PROFILE="${DEVICE_PROFILE:-pixel_5}"

SDKMANAGER="${ANDROID_SDK}/cmdline-tools/latest/bin/sdkmanager"
AVDMANAGER="${ANDROID_SDK}/cmdline-tools/latest/bin/avdmanager"
EMULATOR="${ANDROID_SDK}/emulator/emulator"
ADB="${ANDROID_SDK}/platform-tools/adb"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APK="${1:-${SCRIPT_DIR}/../dist/trust-issues.apk}"
FRIDA_SCRIPT="${SCRIPT_DIR}/solve.js"
PACKAGE="com.breizhctf.trustissues"

log() { printf '\033[1;36m[*]\033[0m %s\n' "$*"; }
ok()  { printf '\033[1;32m[+]\033[0m %s\n' "$*"; }
err() { printf '\033[1;31m[!]\033[0m %s\n' "$*" >&2; }

# ---- 0. Install emulator + system image -------------------------------------
log "Installation emulator + ${IMAGE}"
yes | "${SDKMANAGER}" --licenses >/dev/null 2>&1 || true
"${SDKMANAGER}" --install "emulator" "platform-tools" "platforms;android-${API_LEVEL}" "${IMAGE}"

# ---- 1. Create AVD (idempotent) ---------------------------------------------
if "${AVDMANAGER}" list avd | grep -q "Name: ${AVD_NAME}\b"; then
    ok "AVD ${AVD_NAME} déjà existant"
else
    log "Création AVD ${AVD_NAME}"
    echo "no" | "${AVDMANAGER}" create avd -n "${AVD_NAME}" -k "${IMAGE}" --device "${DEVICE_PROFILE}" --force
fi

# ---- 2. Launch emulator -----------------------------------------------------
if "${ADB}" devices | grep -q "emulator-.*device$"; then
    ok "Émulateur déjà lancé"
else
    log "Lancement émulateur (writable-system, headless si SSH)"
    nohup "${EMULATOR}" -avd "${AVD_NAME}" \
        -writable-system -no-snapshot -no-boot-anim \
        -gpu swiftshader_indirect \
        > /tmp/emulator-${AVD_NAME}.log 2>&1 &
    log "Logs émulateur : /tmp/emulator-${AVD_NAME}.log"
fi

# ---- 3. Wait for boot + root + SELinux permissive --------------------------
log "Attente boot complet (peut prendre 1-2 min)…"
"${ADB}" wait-for-device
"${ADB}" shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 1; done'
ok "Boot OK"

log "adb root + setenforce 0"
"${ADB}" root >/dev/null
"${ADB}" wait-for-device
# adbd restart after `adb root` can race subsequent commands — poll until shell is actually root
for i in $(seq 1 10); do
    if [[ "$("${ADB}" shell id -u 2>/dev/null | tr -d '\r')" == "0" ]]; then
        ok "adb shell is root"
        break
    fi
    sleep 1
    [[ $i -eq 10 ]] && { err "adb root failed — shell is not uid 0"; exit 1; }
done
"${ADB}" shell setenforce 0 || true

# ---- 4. Push & start frida-server -------------------------------------------
if ! command -v frida >/dev/null; then
    err "frida client introuvable — installer via 'pip install frida-tools'"
    exit 1
fi

FRIDA_VER="$(frida --version)"
FRIDA_BIN="/tmp/frida-server-${FRIDA_VER}-android-${ARCH}"

if [[ ! -f "${FRIDA_BIN}" ]]; then
    log "Téléchargement frida-server ${FRIDA_VER} (android-${ARCH})"
    URL="https://github.com/frida/frida/releases/download/${FRIDA_VER}/frida-server-${FRIDA_VER}-android-${ARCH}.xz"
    curl -fsSL "${URL}" -o "${FRIDA_BIN}.xz"
    xz -df "${FRIDA_BIN}.xz"
    chmod +x "${FRIDA_BIN}"
fi

log "Push frida-server vers /data/local/tmp/"
"${ADB}" push "${FRIDA_BIN}" /data/local/tmp/frida-server >/dev/null
"${ADB}" shell chmod 755 /data/local/tmp/frida-server

# Kill any old instance, restart fresh
"${ADB}" shell 'pkill -x frida-server || true'
sleep 1
log "Démarrage frida-server (mode daemon)"
# -D = frida-server se daemonize lui-même (fork+detach).
# /!\ Il FAUT rediriger les 3 fd's sinon `adb shell` reste bloqué — même daemonisé,
#     le process garde stdin/stdout/stderr ouverts vers la connexion adb tant qu'on
#     ne les ferme pas explicitement.
"${ADB}" shell '/data/local/tmp/frida-server -D </dev/null >/dev/null 2>&1'

log "Attente que frida-server soit prêt…"
for i in $(seq 1 15); do
    # `pgrep -x` = match exact sur le nom (évite que pgrep se matche lui-même)
    # Et on vérifie aussi que frida-ps répond — sans ça on a un faux positif si le daemon
    # est en train de se réveiller mais ne répond pas encore aux requêtes
    if "${ADB}" shell 'pgrep -x frida-server' >/dev/null 2>&1 && frida-ps -U >/dev/null 2>&1; then
        ok "frida-server répond (pid $("${ADB}" shell 'pgrep -x frida-server' | tr -d '\r'))"
        break
    fi
    sleep 1
    if [[ $i -eq 15 ]]; then
        err "frida-server n'a pas démarré — debug : 'adb shell ps -ef | grep frida-server'"
        "${ADB}" shell '/data/local/tmp/frida-server --version' 2>&1 || true
        exit 1
    fi
done

# ---- 5. Install APK ---------------------------------------------------------
if [[ ! -f "${APK}" ]]; then
    err "APK introuvable : ${APK}"
    exit 1
fi
log "Installation ${APK}"
"${ADB}" install -r "${APK}"

# ---- 6. Sanity check + lancer le hook --------------------------------------
log "frida-ps -U (vérification connexion)"
frida-ps -U | head -5

ok "Setup terminé."
echo
echo "  Lancer le hook :"
echo "    frida -U -f ${PACKAGE} -l ${FRIDA_SCRIPT}"
