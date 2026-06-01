# Dockerfile
ARG REGISTRY=registry.bzh.alfred.cafe
FROM ${REGISTRY}/breizh-ctf-2026/chall-maker/container/uwsgi

RUN apt-get update && apt-get install -y python3-venv
RUN apt-get update && apt-get install -y bash # Easy rev shell


COPY requirements.txt /challenge/requirements.txt
RUN pip3 install --break-system-packages -r requirements.txt

COPY index.html /challenge/index.html
COPY flag.txt /challenge/flag.txt
COPY tools_server.py /challenge/server.py
