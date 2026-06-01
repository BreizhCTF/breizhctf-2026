#!/bin/sh
# 1. Start hypervisor (background)
./build/hypervisor build/guest.bin 2>&1 &
HPID=$!
echo "Hypervisor started with PID $HPID"

# 2. Start WebSocket proxy on port 1337 (foreground)
# Challenger connects to :1337, forwarded to internal HV on :1338
echo "Starting WebSocket proxy on port 1337 -> 1338"
exec websocat -v -b ws-l:0.0.0.0:1337 tcp:127.0.0.1:1338
