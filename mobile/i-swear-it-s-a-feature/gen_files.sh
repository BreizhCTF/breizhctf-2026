#!/usr/bin/env bash

set -xe

docker build -t messenger-builder --target messenger_builder -f ./src/Dockerfile-insecure ./src

container=$(docker create messenger-builder)

docker cp $container:/build/app/build/outputs/apk/debug/app-debug.apk ./files/bzh-messenger.apk

docker rm $container
