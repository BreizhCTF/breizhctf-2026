#include "debug.h"
#include "io.h"
#include <protocol.h>

#define DIAGNOSTIC_LOG_BASE    0x100000
#define HEAP_BASE 0x100000
#define PAGE_SIZE              4096
#define MAX_DIAGNOSTIC_SECTORS 200
#define ENTROPY_WIDTH        0x90



static uint32_t _mix_ambient_ram_noise(void) {
    volatile uint32_t entropy_pool = 0x811C9DC5; // FNV offset basis
    
    for (int i = 0; i < ENTROPY_WIDTH; i++) {
        uint32_t *noise_ptr = (uint32_t *)(HEAP_BASE + (i * 4096));
        entropy_pool ^= *noise_ptr;
        entropy_pool *= 0x01000193; // FNV prime
    }
    
    return entropy_pool;
}



// ----------------------------------------------------------------------------
// PUBLIC FUNCTIONS
// ----------------------------------------------------------------------------



void handle_maintenance(uint8_t cmd) {
    if (cmd == CMD_RESEED_PRNG) {
        uint32_t seed = _mix_ambient_ram_noise();
        outb(PORT_DATA, (uint8_t)seed); 
        outb(PORT_CMD, SIGNAL_INTERMEDIATE_FLUSH);
    } else if (cmd == CMD_STATUS_CHECK) {
        outb(PORT_DATA, 1);
        outb(PORT_CMD, SIGNAL_INTERMEDIATE_FLUSH);
    }
}