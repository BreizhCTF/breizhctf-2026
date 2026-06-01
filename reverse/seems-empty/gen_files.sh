#/bin/bash
docker build -t seems-empty-builder -f src/Dockerfile src
docker create --name seems-empty seems-empty-builder
docker cp seems-empty:/build/seems-empty.pyc ./files/
docker rm seems-empty
docker rmi seems-empty-builder
