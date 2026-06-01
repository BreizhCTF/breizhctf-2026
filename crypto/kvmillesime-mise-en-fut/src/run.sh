#!/bin/sh


# Run 
docker run -d \
    --name stockbot \
    -p 1337:1337 \
    --device=/dev/kvm \
    ctf-stockbot
