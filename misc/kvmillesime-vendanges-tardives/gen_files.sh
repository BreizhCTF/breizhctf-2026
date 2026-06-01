#!/bin/bash

mkdir -p files
cp src/qemu/pci-rng-ascending.c files/qemu-pci-rng-ascending.c
cp src/guest/ascending-service.c files/vm_init.c
cp src/server.py files/
