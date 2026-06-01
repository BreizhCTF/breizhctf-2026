ARG REGISTRY="registry.bzh.alfred.cafe"

FROM rust:1.94.1-bookworm AS builder

ARG MODE=server
WORKDIR /build
COPY . .
RUN mkdir -p /build/build && \
    if [ "$MODE" = "client" ]; then \
        cargo build --profile challenge --locked -p client \
        && cp target/challenge/client /build/build/challenge; \
    else \
        cargo build --release --locked -p server \
        && cp target/release/server /build/build/challenge; \
    fi


FROM ${REGISTRY}/breizh-ctf-2026/chall-maker/container/tcp

ENV VICTORY_MESSAGE="BZHCTF{n07_4_g10b41_r3v01u710n}"
EXPOSE 4000/udp
COPY --from=builder --chmod=755 --chown=root:root /build/build/challenge /challenge/challenge
ENTRYPOINT ["sh", "-c", "/challenge/challenge"]
