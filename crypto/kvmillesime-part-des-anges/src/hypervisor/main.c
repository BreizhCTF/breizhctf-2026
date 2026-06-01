#include <stdio.h>
#include <stdlib.h>
#include <fcntl.h>
#include <sys/ioctl.h>
#include <pthread.h>
#include <unistd.h>
#include <string.h>
#include "state.h"
#include "crypto.h"
#include "memory.h"
#include "network.h"
#include "vm.h"

struct hv_state state;

/**
 * @brief Initializes the global hypervisor state and mutexes.
 */
static void _initialize_system_state(void) {
    memset(&state, 0, sizeof(state));
    pthread_mutex_init(&state.mtx, NULL);
    pthread_cond_init(&state.cv_input, NULL);
}

/**
 * @brief Opens the KVM device and creates a virtual machine.
 */
static void _setup_kvm_environment(void) {
    state.kvm_fd = open("/dev/kvm", O_RDWR);
    if (state.kvm_fd < 0) {
        perror("open /dev/kvm");
        exit(1);
    }

    state.vm_fd = ioctl(state.kvm_fd, KVM_CREATE_VM, 0);
    if (state.vm_fd < 0) {
        perror("create vm");
        exit(1);
    }
}

/**
 * @brief Allocates guest memory and loads the guest ELF/Binary.
 * @param path Path to the guest binary file.
 */
static void _bootstrap_guest(const char *path) {
    init_guest_memory();
    load_guest_binary(path);

    struct rsa_params initial_params;
    generate_session_keys(&initial_params);
}

/**
 * @brief Initializes the VCPU and starts the background worker thread.
 */
static void _start_virtual_machine_execution(void) {
    init_vcpu();
    start_vcpu_worker();
}

// ----------------------------------------------------------------------------
// PUBLIC FUNCTIONS
// ----------------------------------------------------------------------------

int main(int argc, char **argv) {
    setvbuf(stdout, NULL, _IONBF, 0);

    if (argc < 2) {
        fprintf(stderr, "Usage: %s <guest_binary>\n", argv[0]);
        return 1;
    }

    _initialize_system_state();
    _setup_kvm_environment();
    _bootstrap_guest(argv[1]);
    _start_virtual_machine_execution();
    init_network_server();

    printf("[HV] Ready\n");

    while (1) {
        process_network_events();
    }

    return 0;
}
