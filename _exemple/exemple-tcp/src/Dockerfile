ARG REGISTRY="registry.bzh.alfred.cafe"
FROM debian:bookworm AS builder

RUN apt-get update && apt-get install --no-install-recommends -y build-essential

COPY ./main.c /

RUN gcc -o /challenge /main.c


FROM ${REGISTRY}/breizh-ctf-2026/chall-maker/container/tcp

COPY --from=builder --chmod=755 --chown=root:root ./challenge /challenge/challenge
