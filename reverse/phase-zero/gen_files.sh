#!/bin/bash
rm -rf files && mkdir files
docker build -t phase-zero-builder -f src/Dockerfile src
docker create --name phase-zero phase-zero-builder
docker cp phase-zero:/build/build/bs_phase_zero ./files/
docker rm phase-zero
docker rmi phase-zero-builder
