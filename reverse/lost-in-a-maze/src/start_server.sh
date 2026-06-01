#!/usr/bin/env bash

set -xe

docker build --build-arg MODE=server -t lost-in-a-maze .
docker stop -t 0 lost-in-a-maze 2>/dev/null || true
docker rm -f lost-in-a-maze 2>/dev/null || true
exec docker run --rm --init --name lost-in-a-maze -p 127.0.0.1:4000:4000/udp lost-in-a-maze
