ARG REGISTRY="registry.bzh.alfred.cafe"
FROM ${REGISTRY}/breizh-ctf-2026/chall-maker/container/uwsgi

COPY --chown=root:root static ./static
COPY --chown=root:root templates ./templates
COPY --chown=root:root server.py .
COPY --chown=root:root uart_bootlog.txt /
COPY --chown=root:root firmware.bin /

EXPOSE 80
EXPOSE 1337
