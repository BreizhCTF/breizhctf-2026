#!/bin/sh
set -e

(
    FLAG_FILE="/flag-$(openssl rand -hex 8).txt"
    mv /flag.txt "$FLAG_FILE"
    chown appuser "$FLAG_FILE"
    chmod 440 "$FLAG_FILE"
    openssl rand -hex 16 > /secret_key.txt
    chmod 444 /secret_key.txt
) || 0

gosu appuser sh -c 'cd /app && gunicorn \
    -k gevent -w 1 \
    -b 0.0.0.0:5000 \
    --max-requests 100 \
    --access-logfile - \
    --error-logfile - \
    app:app' &

gosu botuser sh -c 'cd /bot && python bot.py' &

wait
