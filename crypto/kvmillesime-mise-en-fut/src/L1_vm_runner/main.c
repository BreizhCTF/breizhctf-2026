#include <stdint.h>
#include <sys/ioctl.h>
#include <fcntl.h>
#include <linux/kvm.h>
#include <stdio.h>
#include <unistd.h>
#include <stdlib.h>
#include <sys/mman.h>
#include <string.h>
#include <termios.h>


#include "vm_manager.h"
#include "utils.h"

#define VM_MEM_SZ 0x1000000  // 16 MB
#define PORT_SERIAL 0x3f8


// Disable echo & new-line buffering
struct termios old_tio;
struct termios new_tio;




int load_guest_code(uint8_t *guest_mem, uint32_t sz_guest_mem) {
    int ret = 0;
    
    FILE *f = fopen("guest.bin", "rb");
    CHECK(f != 0, "Could not load guest code\n");

    fread(guest_mem, 1, sz_guest_mem, f);

    fclose(f);
    end:
    return ret;
}

int main() {
    int ret = 0;

    struct kvm_run *run = {0};
    int32_t vm_hnd = 0, vcpu_hnd = 0;
    uint8_t *guest_mem = NULL;
    
    // Unbuffer the terminal 
    tcgetattr(STDIN_FILENO, &old_tio);
    memcpy(&new_tio, &old_tio, sizeof(old_tio));
    new_tio.c_lflag &= ~(ICANON | ECHO);
    new_tio.c_cc[VMIN] = 1;
    new_tio.c_cc[VTIME] = 0;
    tcsetattr(STDIN_FILENO, TCSANOW, &new_tio);

    // Create a VM with 1 vcpu
    ret = init_vm(&vm_hnd, &vcpu_hnd, &run);
    CHECK(ret >= 0, "VM Initialization failed.\n");

    ret = allocate_guest_mem(vm_hnd, VM_MEM_SZ, &guest_mem);
    CHECK(ret >= 0, "Could not allocate guest mem");

    // ----------- Copy code in RAM
    ret = load_guest_code(guest_mem, VM_MEM_SZ);
    CHECK(ret >= 0, "No code loaded\n");


    while(1) {
        // ----- RUN
        ret = ioctl(vcpu_hnd, KVM_RUN, 0); // Blocking call
        CHECK(ret >= 0, "[!] KVM_RUN failed\n");

        switch(run->exit_reason) {
            case KVM_EXIT_HLT:
                LOGD("Leaving\n");
                goto end;
                break; 

            case KVM_EXIT_IO:
                // handle out on SERIAL port
                if (run->io.direction == KVM_EXIT_IO_OUT && run->io.port == PORT_SERIAL) {
                    char *p_data = (char*)((uintptr_t)run + run->io.data_offset);
                    printf("%c", *p_data);
                    fflush(stdout);
                    
                }
                // handle in on serial port
                else if (run->io.direction == KVM_EXIT_IO_IN && run->io.port == PORT_SERIAL) {
                    char *p_data = (char*)((uintptr_t)run + run->io.data_offset);
                    // char c = getchar();
                    char c;
                    read(STDIN_FILENO, &c, 1);
                    *p_data = c;

                }
                break;

            case KVM_EXIT_FAIL_ENTRY:
                printf("[!] Failed entry\n");
                goto end;
                break;
            default: 
                printf("[!] Unhandled vm_exit exception %d\n", run->exit_reason);
                goto end;
                break;

            
        }

    }


    end:
    tcsetattr(STDIN_FILENO, TCSANOW, &old_tio);
    return ret;

}