FROM debian:trixie
RUN apt-get update && apt-get install --no-install-recommends -y \
    build-essential \
    meson \
    ninja-build \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /build
COPY main.c meson.build ./
RUN meson setup build && meson compile -C build
