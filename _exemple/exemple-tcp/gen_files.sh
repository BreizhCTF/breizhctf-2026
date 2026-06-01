#!/usr/bin/env bash

set -xe

docker build -t chall src

docker create --name instance chall

docker cp instance:/challenge/challenge ./files/challenge

docker rm instance
docker rmi chall
