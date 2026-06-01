#!/bin/bash
# Bot: runs on the AVD container, automates the Android app
# Logs into the app then periodically navigates channels to trigger WebView loads
APP_PKG="com.breizhctf.iswearitsafeature"
MAIN_ACTIVITY="${APP_PKG}/.MainActivity"
SERVER_HOST="${SERVER_HOST:-server}"
POLL_INTERVAL="${POLL_INTERVAL:-15}"

log() { echo "[BOT] $(date '+%H:%M:%S') $*"; }

# Tap on a UI element found by text in uiautomator dump
tap_element() {
    local text="$1"
    adb shell uiautomator dump /sdcard/ui.xml 2>/dev/null
    local dump
    dump=$(adb shell cat /sdcard/ui.xml 2>/dev/null)

    local bounds
    bounds=$(echo "$dump" | tr '>' '\n' | grep "text=\"${text}\"" | grep -oP 'bounds="\[\d+,\d+\]\[\d+,\d+\]"' | head -1) || true

    if [ -z "$bounds" ]; then
        return 1
    fi

    local x1 y1 x2 y2
    x1=$(echo "$bounds" | grep -oP '\d+' | sed -n 1p)
    y1=$(echo "$bounds" | grep -oP '\d+' | sed -n 2p)
    x2=$(echo "$bounds" | grep -oP '\d+' | sed -n 3p)
    y2=$(echo "$bounds" | grep -oP '\d+' | sed -n 4p)

    if [ -n "$x1" ] && [ -n "$y1" ] && [ -n "$x2" ] && [ -n "$y2" ]; then
        local cx=$(( (x1 + x2) / 2 ))
        local cy=$(( (y1 + y2) / 2 ))
        adb shell input tap "$cx" "$cy"
        return 0
    fi
    return 1
}

# Tap on the Nth EditText field (0-indexed)
tap_edittext() {
    local index="$1"
    adb shell uiautomator dump /sdcard/ui.xml 2>/dev/null
    local dump
    dump=$(adb shell cat /sdcard/ui.xml 2>/dev/null)

    local bounds
    bounds=$(echo "$dump" | tr '>' '\n' | grep 'class="android.widget.EditText"' | sed -n "$((index+1))p" | grep -oP 'bounds="\[\d+,\d+\]\[\d+,\d+\]"' | head -1) || true

    if [ -z "$bounds" ]; then
        return 1
    fi

    local x1 y1 x2 y2
    x1=$(echo "$bounds" | grep -oP '\d+' | sed -n 1p)
    y1=$(echo "$bounds" | grep -oP '\d+' | sed -n 2p)
    x2=$(echo "$bounds" | grep -oP '\d+' | sed -n 3p)
    y2=$(echo "$bounds" | grep -oP '\d+' | sed -n 4p)

    if [ -n "$x1" ] && [ -n "$y1" ] && [ -n "$x2" ] && [ -n "$y2" ]; then
        local cx=$(( (x1 + x2) / 2 ))
        local cy=$(( (y1 + y2) / 2 ))
        adb shell input tap "$cx" "$cy"
        return 0
    fi
    return 1
}

wait_for_server() {
    log "Waiting for server at ${SERVER_HOST}:80..."
    until curl -sf "http://${SERVER_HOST}:80/" >/dev/null 2>&1; do
        sleep 2
    done
    log "Server is up"
}

launch_app() {
    log "Launching app..."
    adb shell am force-stop "$APP_PKG" 2>/dev/null || true
    sleep 1
    adb shell am start -n "$MAIN_ACTIVITY"
    sleep 5
}

login_to_app() {
    log "Logging in as bot..."

    # Tap first EditText (username)
    tap_edittext 0
    sleep 0.5
    adb shell input text "bot"
    sleep 0.3

    # Dismiss keyboard
    adb shell input keyevent 4
    sleep 0.5

    # Tap second EditText (password)
    tap_edittext 1
    sleep 0.5
    adb shell input text 'Tz9qVm3KrW7xNj2Yp6Lc'
    sleep 0.3

    # Dismiss keyboard
    adb shell input keyevent 4
    sleep 0.5

    # Tap Log In button
    tap_element "Log In"
    sleep 5
    log "Login complete"
}

navigate_channel() {
    local channel="$1"
    log "Navigating to #${channel}..."

    # Open sidebar (hamburger icon top-left)
    adb shell input tap 20 40
    sleep 2

    # Find and tap channel name
    tap_element "$channel"

    # Wait for WebView to load and render (XSS triggers here)
    sleep 8
    log "Channel #${channel} loaded"
}

# ==================== MAIN ====================

log "Starting bot..."
wait_for_server
launch_app
login_to_app

log "Bot ready, polling channels every ${POLL_INTERVAL}s"

CHANNELS=("general" "announcements" "flag-submission")

while true; do
    for channel in "${CHANNELS[@]}"; do
        navigate_channel "$channel"
        sleep 3
    done
    log "Poll cycle complete, sleeping ${POLL_INTERVAL}s..."
    sleep "$POLL_INTERVAL"
done
