ARG REGISTRY=registry.bzh.alfred.cafe
FROM ${REGISTRY}/breizh-ctf-2026/chall-maker/container/tcp

# Environment variable for the flag
ENV FLAG="BZHCTF{Th3_M0n3r0_I5_Y0urs_L3ts_Dr1nk_T0_V1nc3}"

# Install dependencies

USER root

RUN apt-get update \
    && apt-get install -y \
    gcc  \
    make \
    wget \
    linux-libc-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*


# Install websocat
RUN wget -q https://github.com/vi/websocat/releases/download/v1.14.0/websocat.x86_64-unknown-linux-musl -O /usr/local/bin/websocat && chmod +x /usr/local/bin/websocat

COPY hypervisor ./hypervisor
COPY guest ./guest
COPY include/ ./include/
COPY Makefile ./
COPY --chmod=755 --chown=root:root entrypoint.sh /challenge/entrypoint.sh

RUN make


ENTRYPOINT ["sh", "-c", "/challenge/entrypoint.sh"]
