docker build -t emulated-trust-builder -f src/Dockerfile src

docker create --name emulated-trust emulated-trust-builder
docker cp emulated-trust:/build/build/bs_emulated_trust ./files/

docker rm emulated-trust
docker rmi emulated-trust-builder
