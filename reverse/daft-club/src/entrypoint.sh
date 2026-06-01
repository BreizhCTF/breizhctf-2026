#!/bin/sh
set -e

fcgiwrap -s unix:/run/fcgiwrap.socket &

# Wait for the socket to appear (up to 2 seconds)
i=0
while [ ! -S /run/fcgiwrap.socket ]; do
    i=$((i + 1))
    if [ "$i" -ge 20 ]; then
        echo "ERROR: fcgiwrap socket never appeared" >&2
        exit 1
    fi
    sleep 0.1
done

# Hand socket ownership to www-data so nginx can connect to it
chown www-data:www-data /run/fcgiwrap.socket

exec nginx -g 'daemon off;'
