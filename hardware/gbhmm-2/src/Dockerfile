ARG REGISTRY="registry.bzh.alfred.cafe"
FROM ${REGISTRY}/breizh-ctf-2026/chall-maker/container/uwsgi

COPY --chown=root:root . .
COPY uart_bootlog.txt /uart_bootlog.txt

EXPOSE 5000
EXPOSE 1337
