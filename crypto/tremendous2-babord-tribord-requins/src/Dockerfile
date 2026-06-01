ARG REGISTRY=registry.bzh.alfred.cafe
FROM ${REGISTRY}/breizh-ctf-2026/chall-maker/container/uwsgi

ENV FLAG="BZHCTF{they_stole_my_beautiful_cookie_very_sad}"

COPY --chown=root:root ./requirements.txt requirements.txt

RUN pip install -r requirements.txt --break-system-packages

COPY --chown=root:root ./src .
