#!/bin/sh
# Started by the nginx entrypoint before nginx itself comes up. Runs the
# Crystal polyglot sandbox in the background as the unprivileged "runner"
# user; the script returns immediately so the entrypoint can continue.
nohup su runner -c 'cd /tmp && exec /app/run' >/tmp/runner.log 2>&1 &
