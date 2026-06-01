#!/bin/sh
exec qemu-system-x86_64 \
    -kernel /challenge/vmlinuz \
    -initrd /challenge/rootfs.cpio \
    -machine accel=tcg \
    -cpu qemu64,vendor=AuthenticAMD,+svm \
    -m 256M \
    -nographic \
    -monitor /dev/null \
    -no-reboot \
    -append "console=ttyS0 quiet"
