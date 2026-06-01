FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libc6-dev \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY generate.py main.c ./

RUN python3 generate.py && \
    gcc -O1 -fno-inline -fno-optimize-sibling-calls \
        -o challenge challenge.c && \
    cp challenge challenge_stripped && \
    strip challenge_stripped
