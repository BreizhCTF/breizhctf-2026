

all:
	gcc -static -lc main.c vm_manager.c -o mini_vm.bin
	cp mini_vm.bin ../linux-6.18.8/build_rootfs/mnt/

payload: 
	nasm -f bin payload.asm -o payload.bin
	xxd -i payload.bin > payload_snippet.c

test_out:
	nasm -f bin test_write_stdout.asm -o test_out.bin
	xxd -i test_out.bin > test_out.c

test_echo:
	nasm -f bin test_echo.asm -o test_echo.bin
	xxd -i test_echo.bin > test_echo.c
