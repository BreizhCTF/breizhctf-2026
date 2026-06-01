.PHONY: all build run test clean

GUEST_OBJS = build/guest.o build/bn.o build/rsa.o build/debug.o
HV_OBJS = build/main.o build/crypto.o build/memory.o build/network.o build/vm.o
INCLUDES = -Iinclude

all: build

build:
	mkdir -p build
	# Build guest components
	gcc -m32 -nostdlib -fno-builtin -fno-stack-protector -fno-pic -no-pie $(INCLUDES) -DGUEST -c -o build/guest.o guest/guest.c
	gcc -m32 -nostdlib -fno-builtin -fno-stack-protector -fno-pic -no-pie $(INCLUDES) -DGUEST -c -o build/bn.o guest/bn.c
	gcc -m32 -nostdlib -fno-builtin -fno-stack-protector -fno-pic -no-pie $(INCLUDES) -DGUEST -c -o build/rsa.o guest/rsa.c
	gcc -m32 -nostdlib -fno-builtin -fno-stack-protector -fno-pic -no-pie $(INCLUDES) -DGUEST -c -o build/debug.o guest/debug.c
	# Link guest
	gcc -m32 -nostdlib -fno-builtin -fno-stack-protector -fno-pic -no-pie -Wl,-T,guest/linker.ld -Wl,--build-id=none -Wl,-no-pie -o build/guest.elf $(GUEST_OBJS)
	objcopy -O binary build/guest.elf build/guest.bin
	# Build hypervisor components
	gcc $(INCLUDES) -c -o build/main.o hypervisor/main.c
	gcc $(INCLUDES) -c -o build/crypto.o hypervisor/crypto.c
	gcc $(INCLUDES) -c -o build/memory.o hypervisor/memory.c
	gcc $(INCLUDES) -c -o build/network.o hypervisor/network.c
	gcc $(INCLUDES) -c -o build/vm.o hypervisor/vm.c
	# Link hypervisor
	gcc -o build/hypervisor $(HV_OBJS) -lpthread -lcrypto

test: build
	cd build && python3 solve.py

run:
	cd build && websocat -E ws-l:0.0.0.0:1337 cmd:./hypervisor ./guest.bin

clean:
	rm -rf build
	docker rm -f kvmembert_challenge 2>/dev/null || true
