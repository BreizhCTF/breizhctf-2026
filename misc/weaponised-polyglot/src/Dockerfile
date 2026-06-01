# Merged Dockerfile: builds the Crystal runner backend and the Flask frontend
# in a single image. Both services run side-by-side, the frontend served via
# the uwsgi base image (nginx -> uwsgi -> Flask on port 80) and the runner
# reached over localhost:8080.

ARG REGISTRY=registry.bzh.alfred.cafe

#####################################################################
# Stage 1 - build the Crystal runner binary
#####################################################################
FROM ubuntu:22.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive
ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
        bash \
        curl \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://crystal-lang.org/install.sh | bash

COPY back/chall.cr /build/chall.cr
RUN mkdir /app && \
    crystal build --no-debug --release --static --stats --progress \
        -o /app/run /build/chall.cr && \
    chmod 711 /app/run

#####################################################################
# Stage 2 - runtime image based on the uwsgi base (see container/uwsgi)
#####################################################################
FROM ${REGISTRY}/breizh-ctf-2026/chall-maker/container/uwsgi

ARG DEBIAN_FRONTEND=noninteractive

# Polyglot interpreters + the python deps the Flask app needs on top of the
# python3-flask already provided by the base image.
RUN apt-get update && apt-get install -y \
        python3-requests \
        ruby \
        perl \
        lua5.3 \
        php-cli \
        sqlite3 \
        bash \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    (useradd -m -u 1000 runner || true)

# Crystal runner binary. Owned by `root:runner` with mode 0110 so that the
# `runner` user can execute it (via group permission) but cannot read it
# or change its mode (not the owner). The `challenge` user (running
# uwsgi/Flask) has no access at all, and code submitted through the web
# UI runs as `runner` so it cannot exfiltrate the backend binary either.
COPY --from=builder --chown=root:runner /app/run /app/run
RUN chmod 0110 /app/run

# Flask frontend - uwsgi.ini in the base image expects module "server:app"
# under /challenge/, so app.py is installed as server.py here.
COPY front/app.py               /challenge/server.py
COPY front/templates/index.html /challenge/templates/index.html
COPY front/static/assets        /challenge/static/assets
RUN chown -R challenge:challenge /challenge

# Runner sandbox starter; runs before nginx via the base image's
# /docker-entrypoint.d/ hook. Numeric prefix sorts it before start_uwsgi.sh.
COPY start_runner.sh /docker-entrypoint.d/05-start-runner.sh
RUN chmod +x /docker-entrypoint.d/05-start-runner.sh

# Frontend reaches the runner over localhost (single-container deployment).
ENV RUNNER_BACKEND_URL=http://127.0.0.1:8080

EXPOSE 80
