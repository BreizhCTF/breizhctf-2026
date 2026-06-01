ARG REGISTRY=registry.bzh.alfred.cafe

# =========================
# Builder: Guest RootFS
# =========================
FROM debian:trixie AS guest_builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libc6-dev cpio \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /build/initramfs/dev /build/initramfs/proc /build/initramfs/sys
WORKDIR /build

COPY guest/ascending-service.c .
# Produce a minimal initramfs containing the challenge init binary.
RUN gcc -static -o init ascending-service.c \
    && cp init initramfs/init \
    && cd initramfs \
    && find . -print0 | cpio --null -ov --format=newc > ../rootfs.cpio


# =========================
# Builder: QEMU
# =========================
FROM debian:trixie AS qemu_builder

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install --no-install-recommends -y \
    bash bc bison bzip2 ca-certificates ccache findutils flex gcc git \
    libc6-dev libfdt-dev libffi-dev libglib2.0-dev libpixman-1-dev locales \
    make meson ninja-build pkgconf python3 python3-venv seabios sed tar \
    && rm -rf /var/lib/apt/lists/*
RUN sed -Ei 's,^# (en_US\.UTF-8 .*)$,\1,' /etc/locale.gen && dpkg-reconfigure locales
RUN rm -f /usr/lib*/python3*/EXTERNALLY-MANAGED
RUN mkdir -p /usr/libexec/ccache-wrappers \
    && ln -s /usr/bin/ccache /usr/libexec/ccache-wrappers/cc \
    && ln -s /usr/bin/ccache /usr/libexec/ccache-wrappers/gcc

ENV CCACHE_WRAPPERSDIR="/usr/libexec/ccache-wrappers"
ENV LANG="en_US.UTF-8"
ENV MAKE="/usr/bin/make"
ENV NINJA="/usr/bin/ninja"
ENV PYTHON="/usr/bin/python3"

RUN git clone --depth 1 --branch "v10.2.0" https://github.com/qemu/qemu.git /qemu
WORKDIR /qemu

COPY qemu/pci-rng-ascending.c hw/misc/
# Register the custom ascending PCI device in QEMU build files.
RUN printf "\nconfig PCI_RNG_ASCENDING\n    bool\n    default y\n    depends on PCI\n" >> hw/misc/Kconfig
RUN echo "system_ss.add(when: 'CONFIG_PCI_RNG_ASCENDING', if_true: files('pci-rng-ascending.c'))" >> hw/misc/meson.build

RUN mkdir -p build \
    && cd build \
    && ../configure --target-list="x86_64-softmmu" \
        --without-default-features \
        --enable-tcg \
        --enable-kvm \
        --enable-fdt=system \
        --enable-pie \
        --enable-strip \
        --enable-tools \
        --static \
    && JOBS="$(nproc)" \
    && if [ "${JOBS}" -gt 1 ]; then JOBS="$((JOBS-1))"; fi \
    && make -j"${JOBS}"
    # Export only runtime artifacts consumed by the final image.
RUN apt update && apt install -y qemu-system-data
RUN cd build \
    && mkdir -p /out \
    && cp qemu-img /out/qemu-img \
    && cp qemu-system-x86_64 /out/qemu-system \
    && cp -rL pc-bios /out/pc-bios \
    && cp -rL /usr/share/qemu/. /out/pc-bios/ \
    && cp /usr/share/seabios/bios-256k.bin /out/pc-bios/bios-256k.bin


# =========================
# Builder: Kernel
# =========================
FROM debian:trixie AS kernel_builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget xz-utils build-essential gcc flex bison bc ca-certificates libelf-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /work
RUN wget https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-6.18.8.tar.xz \
    && tar -xf linux-6.18.8.tar.xz

WORKDIR /work/linux-6.18.8
COPY vmlinuz/aarch64_min.config /tmp/aarch64_min.config
COPY vmlinuz/x86_64_min.config /tmp/x86_64_min.config

# Build kernel image format expected by each architecture.
RUN cp /tmp/x86_64_min.config min.config \
    && make mrproper \
    && make allnoconfig \
    && ./scripts/kconfig/merge_config.sh .config min.config \
    && JOBS="$(nproc)" \
    && if [ "${JOBS}" -gt 1 ]; then JOBS="$((JOBS-1))"; fi \
    && make -j"${JOBS}" bzImage \
    && mkdir -p /out \
    && cp arch/x86/boot/bzImage /out/small_vmlinuz

# =========================
# Runtime Image
# =========================
FROM ${REGISTRY}/breizh-ctf-2026/chall-maker/container/tcp

USER root
ENV FLAG="BZHCTF{Namaste_V1nce_Th4nks_F0r_The_Seed_M0ney}"

COPY --chmod=755 --chown=root:root requirements.txt .
COPY --from=ghcr.io/astral-sh/uv:0.6.8 /uv /uvx /bin/
RUN uv pip install --break-system-packages -r requirements.txt --system


COPY --from=guest_builder --chown=root:root /build/rootfs.cpio /challenge/build/rootfs.cpio
COPY --from=qemu_builder --chown=root:root /out/qemu-img /challenge/build/qemu-img
COPY --from=qemu_builder --chown=root:root /out/qemu-system /challenge/build/qemu-system
COPY --from=qemu_builder --chown=root:root /out/pc-bios /challenge/build/pc-bios
COPY --from=kernel_builder --chown=root:root /out/small_vmlinuz /challenge/build/small_vmlinuz

COPY --chmod=700 --chown=challenge:challenge server.py /challenge/challenge
