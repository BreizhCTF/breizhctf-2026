FROM debian:trixie AS ollvm-toolchain

RUN apt-get update && apt-get install --no-install-recommends -y \
    bzip2 \
    ca-certificates \
    curl \
    tar \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt

RUN curl -L -o tigress-4.0.11-full.zip \
    'https://tigress.cs.arizona.edu/cgi-bin/projects/tigress/download.cgi?accept=Accept+and+Download&mode=download&buffer=address%3Abzh----email%3Abzh%40bzh.bzh----file%3Atigress-4.0.11-full.zip----name%3Abzh----remote_addr%3D0.0.0.0----timestamp%3DTue_Apr_21_13%3A23%3A58_2026&file=tigress-4.0.11-full.zip&destfile=tigress-4.0.11-full.zip' \
    && apt-get update \
    && apt-get install --no-install-recommends -y unzip \
    && mkdir -p /opt/tigress \
    && unzip tigress-4.0.11-full.zip -d /opt/tigress \
    && rm tigress-4.0.11-full.zip \
    && rm -rf /var/lib/apt/lists/*

FROM debian:trixie

RUN apt-get update && apt-get install --no-install-recommends -y \
    build-essential \
    gcc \
    meson \
    ninja-build \
    python3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ollvm-toolchain /opt/tigress /opt/tigress

WORKDIR /build
COPY *.c *.h meson.build ./

RUN meson setup build && meson compile -C build
