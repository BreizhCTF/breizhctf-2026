ARG REGISTRY=registry.bzh.alfred.cafe
FROM ${REGISTRY}/breizh-ctf-2026/chall-maker/container/nginx

COPY client/ /challenge/
