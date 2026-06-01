#!/usr/bin/env bash
set -xe
docker build --target builder --build-arg MODE=client -t lost_in_a_maze src
docker create --name instance_lost_in_a_maze lost_in_a_maze
docker cp instance_lost_in_a_maze:/build/build/challenge ./files/lost_in_a_maze
docker rm instance_lost_in_a_maze
docker rmi lost_in_a_maze
