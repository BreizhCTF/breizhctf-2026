#ifndef STATE_H
#define STATE_H

#include <stdint.h>
#include <pthread.h>
#include <linux/kvm.h>
#include <time.h>
#include <protocol.h>

/**
 * @brief Memory Layout Constants (Hypervisor Physical View)
 */
#define GUEST_SIZE             0x200000 
#define CONFIG_PHYS_0          0x6000
#define CONFIG_PHYS_1          0x7000
#define SCRATCHPAD_PHYS_0      0x8000   
#define SCRATCHPAD_PHYS_1      0x9000   

#define MAX_CLIENTS 10

/**
 * @struct hv_state
 * @brief Global singleton representing the Hypervisor's runtime state.
 */
struct hv_state {
    // KVM FDs
    int kvm_fd;
    int vm_fd;
    int vcpu_fd;
    struct kvm_run *run;

    // Memory Regions
    uint8_t *mem_low;       
    uint8_t *config_page_0;
    uint8_t *config_page_1;
    uint8_t *q_page_0;  
    uint8_t *q_page_1;  
    uint8_t *mem_high;  

    int active_page_idx;

    // Networking
    int server_fd;
    int client_fds[MAX_CLIENTS];
    int active_client_idx;
    int minting_in_progress;

    // I/O Buffering
    uint8_t output_buf[4096];
    int output_ptr;
    uint8_t input_queue[4096];
    int input_head;
    int input_tail;

    // Synchronization
    pthread_mutex_t mtx;
    pthread_cond_t cv_input;
    
    // Internal Cryptography
    struct q_params real_q_params;

    // Asynchronous Secure Element Sync
    int secure_element_syncing;
    time_t sync_start_time;
};

extern struct hv_state state;

#endif
