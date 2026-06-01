#!/bin/bash
if [ -e /dev/kvm ]; then
    chmod 666 /dev/kvm
fi

# On lance socat en tant que 'ctf' (switch user)
socat -dd TCP-LISTEN:1337,reuseaddr,fork EXEC:/challenge/run_qemu.sh,pty,stderr

