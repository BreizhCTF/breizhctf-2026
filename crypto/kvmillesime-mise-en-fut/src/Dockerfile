
# =========================
# Builder: Guest RootFS
# =========================
FROM debian:trixie AS l2_guest_builder

ARG FLAG="BZHCTF{N4m4st3_V1nc3_H0p3_M4r14_3nj0y3d_Th3_H0t_Y0g4}"

RUN apt-get update && apt-get install -y --no-install-recommends \
    nasm gcc libc6-dev cpio make \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /out 

ADD L2_stockbot /build
WORKDIR /build

RUN make FLAG="${FLAG}"

RUN cp guest.bin /out/guest.bin


# =========================
# Builder: L1 VM runner 
# =========================
FROM debian:trixie AS l1_vm_runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libc6-dev cpio \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /build
RUN mkdir -p /out 

WORKDIR /build
ADD L1_vm_runner /build/

RUN gcc -static -lc main.c vm_manager.c -o /out/mini_vm.bin

# =========================
# Builder: L1 Root fs 
# =========================
FROM debian:trixie AS l1_guest

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libc6-dev cpio \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /build
RUN mkdir -p /out 

WORKDIR /build


RUN mkdir -p bin sbin etc proc sys dev mnt/mini_vm tmp usr/bin usr/sbin

COPY --chown=root:root furniture/rootfs/init .
COPY --chown=root:root furniture/rootfs/busybox ./bin/busybox

COPY --from=l1_vm_runner --chown=root:root /out/mini_vm.bin ./mini_vm
COPY --from=l2_guest_builder --chown=root:root /out/guest.bin ./guest.bin

RUN find . -print0 | cpio --null -ov --format=newc > /out/rootfs.cpio




# =========================
# Builder: L1 - Kernel
# =========================
FROM debian:trixie AS l1_kernel_builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget xz-utils build-essential gcc flex bison bc ca-certificates libelf-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /work
RUN wget https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-6.18.8.tar.xz \
    && tar -xf linux-6.18.8.tar.xz

WORKDIR /work/linux-6.18.8
COPY L1_kernel/kvm.config /tmp/min.config
COPY L1_kernel/svm.c ./arch/x86/kvm/svm/svm.c
COPY L1_kernel/svm.h ./arch/x86/kvm/svm/svm.h

# Build kernel image format expected by each architecture.
RUN cp /tmp/min.config min.config \
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
FROM debian:trixie-slim


RUN apt-get update && apt-get install -y --no-install-recommends \
	socat qemu-system-x86 seabios \
	&& rm -rf /var/lib/apt/lists/*

# FROM python:3.12.2-slim-bookworm
# Expose selected build arch to server.py runtime selection.
# COPY --from=ghcr.io/astral-sh/uv:0.6.8 /uv /uvx /bin/

RUN useradd -m -d /home/challenge -s /bin/bash challenge
RUN mkdir -p /challenge/build
WORKDIR /challenge

COPY --chmod=755 --chown=root:root furniture/docker_entry/run_qemu.sh .
COPY --chmod=755 --chown=root:root furniture/docker_entry/entrypoint.sh .


# COPY --from=guest_builder --chown=root:root /build/rootfs.cpio /challenge/build/rootfs.cpio
# COPY --from=qemu_builder --chown=root:root /out/qemu-img /challenge/build/qemu-img
# COPY --from=qemu_builder --chown=root:root /out/qemu-system /challenge/build/qemu-system
# COPY --from=qemu_builder --chown=root:root /out/pc-bios /challenge/build/pc-bios

COPY --from=l1_guest --chown=root:root /out/rootfs.cpio /challenge/
COPY --from=l1_kernel_builder --chown=root:root /out/small_vmlinuz /challenge/vmlinuz

EXPOSE 1337 
CMD ["/challenge/entrypoint.sh"]
