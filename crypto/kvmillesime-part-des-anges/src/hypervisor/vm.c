#include <sys/ioctl.h>
#include <sys/mman.h>
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <time.h>
#include "vm.h"
#include "state.h"

/**
 * @brief Pops a single byte from the guest's input queue.
 */
static uint8_t _pop_input_byte(void) {
    pthread_mutex_lock(&state.mtx);
    while (state.input_head == state.input_tail) {
        pthread_cond_wait(&state.cv_input, &state.mtx);
    }
    uint8_t value = state.input_queue[state.input_head];
    state.input_head = (state.input_head + 1) % 4096;
    pthread_mutex_unlock(&state.mtx);
    return value;
}

/**
 * @brief Checks if there is any data pending in the input queue.
 */
static uint8_t _is_input_available(void) {
    uint8_t available = 0;
    pthread_mutex_lock(&state.mtx);
    if (state.input_head != state.input_tail) {
        available = 1;
    }
    pthread_mutex_unlock(&state.mtx);
    return available;
}

/**
 * @brief Handles a request for the flag by reading from the environment.
 */
static void _emit_flag_to_client(int client_fd) {
    const char *flag = getenv("FLAG");
    if (flag) {
        write(client_fd, flag, strlen(flag));
        write(client_fd, "\n", 1);
    }
}

/**
 * @brief Interprets guest output and dispatches the final response to the active client.
 */
static void _dispatch_guest_response(void) {
    if (state.active_client_idx == -1) return;
    int client_fd = state.client_fds[state.active_client_idx];
    if (client_fd == -1) return;

    if (state.output_ptr == 1 && state.output_buf[0] == STATUS_ACCESS_GRANTED) {
        _emit_flag_to_client(client_fd);
    } else {
        write(client_fd, state.output_buf, state.output_ptr);
    }
    state.output_ptr = 0;
}

/**
 * @brief Handles an output operation to a guest I/O port.
 */
static void _handle_port_output(uint16_t port, uint8_t value) {
    if (port == PORT_DATA) {
        pthread_mutex_lock(&state.mtx);
        if (state.output_ptr < 4096) state.output_buf[state.output_ptr++] = value;
        pthread_mutex_unlock(&state.mtx);
    } else if (port == PORT_DEBUG) {
        putchar(value); fflush(stdout);
    } else if (port == PORT_CMD) {
        if (value == SIGNAL_DONE || value == SIGNAL_INTERMEDIATE_FLUSH) {
            pthread_mutex_lock(&state.mtx);
            if (value == SIGNAL_DONE) state.minting_in_progress = 0;
            _dispatch_guest_response();
            pthread_mutex_unlock(&state.mtx);
        } else if (value == SIGNAL_READY) {
            printf("[HV] Enclave initialized.\n");
        }
    } else if (port == PORT_SECURE_ELEMENT) {
        if (value == 1) {
            state.sync_start_time = time(NULL);
            state.secure_element_syncing = 1;
        }
    }
}

/**
 * @brief Handles an input operation from a guest I/O port.
 */
static uint8_t _handle_port_input(uint16_t port) {
    if (port == PORT_DATA) {
        return _pop_input_byte();
    } else if (port == PORT_STATUS) {
        return _is_input_available();
    } else if (port == PORT_SECURE_ELEMENT) {
        if (state.secure_element_syncing) {
            if (time(NULL) - state.sync_start_time >= 1) {
                state.secure_element_syncing = 0;
                return 1; // Sync complete
            }
            return 0; // Sync in progress
        }
        return 1; // Default to idle/ready
    }
    return 0;
}

/**
 * @brief Dispatches a KVM I/O exit to the appropriate handler.
 */
static void _dispatch_io_event(void) {
    uint8_t *data = (uint8_t *)state.run + state.run->io.data_offset;
    if (state.run->io.direction == KVM_EXIT_IO_OUT) {
        _handle_port_output(state.run->io.port, *data);
    } else {
        *data = _handle_port_input(state.run->io.port);
    }
}

/**
 * @brief Configures the VCPU segment registers.
 */
static void _configure_vcpu_segments(void) {
    struct kvm_sregs sregs;
    ioctl(state.vcpu_fd, KVM_GET_SREGS, &sregs);
    sregs.cs.base = 0; sregs.cs.limit = 0xFFFFFFFF; sregs.cs.selector = 0x08;
    sregs.cs.type = 0x0B; sregs.cs.s = 1; sregs.cs.present = 1; sregs.cs.db = 1; sregs.cs.g = 1;
    sregs.ds.base = 0; sregs.ds.limit = 0xFFFFFFFF; sregs.ds.selector = 0x10;
    sregs.ds.type = 0x03; sregs.ds.s = 1; sregs.ds.present = 1; sregs.ds.db = 1; sregs.ds.g = 1;
    sregs.es = sregs.ds; sregs.fs = sregs.ds; sregs.gs = sregs.ds; sregs.ss = sregs.ds;
    sregs.cr0 |= 0x1;
    ioctl(state.vcpu_fd, KVM_SET_SREGS, &sregs);
}

/**
 * @brief Configures the VCPU general purpose registers.
 */
static void _configure_vcpu_registers(void) {
    struct kvm_regs regs = { 
        .rip = 0, 
        .rflags = 0x2, 
        .rsp = 0x6F00 
    };
    ioctl(state.vcpu_fd, KVM_SET_REGS, &regs);
}

/**
 * @brief Thread worker function that runs the VCPU loop.
 */
static void * _vcpu_worker_thread(void *arg) {
    while (1) {
        if (ioctl(state.vcpu_fd, KVM_RUN, 0) < 0) {
            if (errno == EINTR) continue;
            break;
        }
        if (state.run->exit_reason == KVM_EXIT_IO) {
            _dispatch_io_event();
        } else if (state.run->exit_reason == KVM_EXIT_SHUTDOWN) {
            exit(0);
        }
    }
    return NULL;
}

// ----------------------------------------------------------------------------
// PUBLIC FUNCTIONS
// ----------------------------------------------------------------------------

void init_vcpu(void) {
    state.vcpu_fd = ioctl(state.vm_fd, KVM_CREATE_VCPU, 0);
    int mmap_size = ioctl(state.kvm_fd, KVM_GET_VCPU_MMAP_SIZE, 0);
    state.run = mmap(NULL, mmap_size, PROT_READ|PROT_WRITE, MAP_SHARED, state.vcpu_fd, 0);

    _configure_vcpu_segments();
    _configure_vcpu_registers();
}

void start_vcpu_worker(void) {
    pthread_t vcpu_thread;
    pthread_create(&vcpu_thread, NULL, _vcpu_worker_thread, NULL);
}
