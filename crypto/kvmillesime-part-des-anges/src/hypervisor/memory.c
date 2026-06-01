#include <sys/mman.h>
#include <sys/ioctl.h>
#include <fcntl.h>
#include <unistd.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include "memory.h"
#include "state.h"

/**
 * @brief Allocates all required guest memory regions.
 */
static void _allocate_guest_physical_regions(void) {
    // mem_low only goes up to CONFIG_PHYS_0 now
    state.mem_low = mmap(NULL, CONFIG_PHYS_0, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0);
    state.config_page_0 = mmap(NULL, 4096, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0);
    state.config_page_1 = mmap(NULL, 4096, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0);
    state.q_page_0 = mmap(NULL, 4096, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0);
    state.q_page_1 = mmap(NULL, 4096, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0);
    state.mem_high = mmap(NULL, GUEST_SIZE - (SCRATCHPAD_PHYS_1 + 4096), PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0);
}

static void _register_kvm_memory_slots(void) {
    struct kvm_userspace_memory_region regions[] = {
        { .slot = 0, .guest_phys_addr = 0, .memory_size = CONFIG_PHYS_0, .userspace_addr = (uint64_t)state.mem_low },
        { .slot = 1, .guest_phys_addr = CONFIG_PHYS_0, .memory_size = 4096, .userspace_addr = (uint64_t)state.config_page_0 },
        { .slot = 2, .guest_phys_addr = CONFIG_PHYS_1, .memory_size = 4096, .userspace_addr = (uint64_t)state.config_page_1 },
        { .slot = 3, .guest_phys_addr = SCRATCHPAD_PHYS_0, .memory_size = 4096, .userspace_addr = (uint64_t)state.q_page_0 },
        { .slot = 4, .guest_phys_addr = SCRATCHPAD_PHYS_1, .memory_size = 4096, .userspace_addr = (uint64_t)state.q_page_1 },
        { .slot = 5, .guest_phys_addr = SCRATCHPAD_PHYS_1 + 4096, .memory_size = GUEST_SIZE - (SCRATCHPAD_PHYS_1 + 4096), .userspace_addr = (uint64_t)state.mem_high }
    };

    for (int i = 0; i < 6; i++) {
        ioctl(state.vm_fd, KVM_SET_USER_MEMORY_REGION, &regions[i]);
    }
}


static void _shift_reality_plane(uint32_t virtual_address, uint32_t physical_frame) {
    uint32_t *dma_ring = (uint32_t *)(state.mem_low + PAGE_TABLE_ADDR);
    uint32_t ring_index = virtual_address / SCRATCHPAD_SIZE;
    
    dma_ring[ring_index] = physical_frame | PTE_PRESENT_WRITABLE_USER; 
}

// ----------------------------------------------------------------------------
// PUBLIC FUNCTIONS
// ----------------------------------------------------------------------------

/**
 * @brief Sets up all guest memory regions and maps them to KVM memory slots.
 */
void init_guest_memory(void) {
    _allocate_guest_physical_regions();
    _register_kvm_memory_slots();
    state.active_page_idx = 0;
}

/**
 * @brief Reads the guest binary from disk and loads it into the enclave memory space.
 * @param path Path to the guest.bin file.
 */
void load_guest_binary(const char *path) {
    int fd = open(path, O_RDONLY);
    if (fd < 0) {
        perror("open guest binary");
        exit(1);
    }
    
    if (read(fd, state.mem_low, SCRATCHPAD_VIRT_ADDR) < 0) {
        perror("read guest binary");
        exit(1);
    }
    
    close(fd);
}

void update_session_context_mapping(struct rsa_params *new_params) {
    uint8_t *next_c_ptr = (state.active_page_idx == 0) ? state.config_page_1 : state.config_page_0;
    uint32_t next_c_gpa = (state.active_page_idx == 0) ? CONFIG_PHYS_1 : CONFIG_PHYS_0;

    uint8_t *next_q_ptr = (state.active_page_idx == 0) ? state.q_page_1 : state.q_page_0;
    uint32_t next_q_gpa = (state.active_page_idx == 0) ? SCRATCHPAD_PHYS_1 : SCRATCHPAD_PHYS_0;
    
    memcpy(next_c_ptr, new_params, sizeof(struct rsa_params));
    memcpy(next_q_ptr, &state.real_q_params, sizeof(struct q_params));
    
    _shift_reality_plane(CONFIG_REGION_ADDR, next_c_gpa);
    _shift_reality_plane(SCRATCHPAD_VIRT_ADDR, next_q_gpa);
    
    state.active_page_idx = 1 - state.active_page_idx;
}
