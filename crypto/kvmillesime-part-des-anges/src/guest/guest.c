#include "bn.h"
#include "rsa.h"
#include "debug.h"
#include "io.h"
#include <protocol.h>

#define MAX_SIGNINGS 100
static uint32_t s_authorized_signings = 0;

/**
 * @brief Singleton references to memory-mapped RSA parameters.
 */
static const struct rsa_params *const g_params = (struct rsa_params *)CONFIG_REGION_ADDR;
static const struct q_params *const g_q_params = (struct q_params *)SCRATCHPAD_VIRT_ADDR;

/**
 * @brief Configures identity-mapped paging for the first 4MB of RAM.
 */
static void _bootstrap_virtual_memory(void) {
    uint32_t *pd = (uint32_t *)PAGE_DIR_ADDR;
    uint32_t *pt = (uint32_t *)PAGE_TABLE_ADDR;

    for (int i = 0; i < 1024; i++) {
        pd[i] = 0;
        pt[i] = 0;
    }

    for (int i = 0; i < 1024; i++) {
        pt[i] = (i * 0x1000) | PTE_PRESENT_WRITABLE_USER; 
    }

    pd[0] = PAGE_TABLE_ADDR | PTE_PRESENT_WRITABLE_USER; 

    __asm__ volatile (
        "mov %0, %%eax\n\t"
        "mov %%eax, %%cr3\n\t"
        "mov %%cr0, %%eax\n\t"
        "or $0x80000000, %%eax\n\t"
        "mov %%eax, %%cr0\n\t"
        :
        : "r"(pd)
        : "eax"
    );
}

/**
 * @brief Handles the CMD_GET_PUBKEY request.
 */
static void _handle_get_pubkey(void) {
    send_bytes((const uint8_t *)g_params->n, 128); 
    send_bytes((const uint8_t *)&g_params->e, 4);
    outb(PORT_CMD, SIGNAL_DONE);
}

/**
 * @brief Handles the CMD_MINT_NFT request.
 */
static void _handle_mint_nft(void) {
    uint8_t target_msg[32] = "ADMIN_RUGPULL_ROI_1000X";
    for (int i = 24; i < 32; i++) target_msg[i] = 0;

    uint8_t msg[32], sig[128];
    recv_bytes(msg, 32);

    if (s_authorized_signings >= MAX_SIGNINGS) {
        outb(PORT_DATA, STATUS_ACCESS_DENIED);
        outb(PORT_CMD, SIGNAL_DONE);
        return;
    }
    s_authorized_signings++;

    int msg_match = 1;
    for (int i = 0; i < 32; i++) {
        if (msg[i] != target_msg[i]) msg_match = 0;
    }
    if (msg_match) {
        outb(PORT_DATA, 0x01); 
        outb(PORT_CMD, SIGNAL_DONE);
        return;
    }

    uint8_t padded_msg[128];
    for (int i = 0; i < 32; i++) padded_msg[i] = msg[i];
    padded_msg[32] = 0x00;
    for (int i = 33; i < 126; i++) padded_msg[i] = 0xFF;
    padded_msg[126] = 0x01;
    padded_msg[127] = 0x00;

    rsa_crt_sign(padded_msg, sig, g_params, g_q_params);
    outb(PORT_DATA, 0); 
    send_bytes(sig, 128);
    outb(PORT_CMD, SIGNAL_DONE);
}


/**
 * @brief Handles the CMD_WITHDRAW_FUNDS request.
 */
static void _handle_withdraw_funds(void) {
    uint8_t target_msg[32] = "ADMIN_RUGPULL_ROI_1000X";
    for (int i = 24; i < 32; i++) target_msg[i] = 0;

    uint8_t msg[32], sig[128];
    recv_bytes(msg, 32);
    recv_bytes(sig, 128);

    int msg_match = 1;
    for (int i = 0; i < 32; i++) {
        if (msg[i] != target_msg[i]) msg_match = 0;
    }

    if (!msg_match) {
        outb(PORT_DATA, STATUS_ACCESS_DENIED);
    } else {
        uint8_t padded_msg[128];
        for (int i = 0; i < 32; i++) padded_msg[i] = msg[i];
        padded_msg[32] = 0x00;
        for (int i = 33; i < 126; i++) padded_msg[i] = 0xFF;
        padded_msg[126] = 0x01;
        padded_msg[127] = 0x00;

        if (rsa_verify(padded_msg, sig, g_params)) {
            outb(PORT_DATA, STATUS_ACCESS_GRANTED);
        } else {
            outb(PORT_DATA, STATUS_BAD_SIGNATURE);
        }
    }
    outb(PORT_CMD, SIGNAL_DONE);
}

/**
 * @brief Checks if a public key is sanctioned by verifying its RSA padding.
 */
static void _handle_check_sanctions(void) {
    uint8_t payload[128];
    recv_bytes(payload, 128);
    
    static bn_t c_limbs, m_limbs, e_limbs;
    bn_clear(&c_limbs);
    for (int i = 0; i < 128; i++) {
        c_limbs.limbs[i / 4] |= ((uint32_t)payload[i]) << ((i % 4) * 8);
    }
    bn_clear(&e_limbs); e_limbs.limbs[0] = g_params->e;
    
    mod_exp(&m_limbs, &c_limbs, &e_limbs, (const bn_t *)g_params->n, 32);
    
    uint8_t byte0 = (uint8_t)(m_limbs.limbs[31] >> 24);
    uint8_t byte1 = (uint8_t)(m_limbs.limbs[31] >> 16);
    
    if (byte0 == 0x00 && byte1 == 0x02) {
        outb(PORT_DATA, 0x01); 
    } else {
        outb(PORT_DATA, 0x00); 
    }
    outb(PORT_CMD, SIGNAL_DONE);
}

/**
 * @brief Handles a request to abort the minting process, used for diagnostics.
 */
static void _handle_abort_mint(void) {
    uint8_t crash_buffer[16];
    recv_bytes(crash_buffer, 32); 
    
    outb(PORT_DATA, crash_buffer[0]);
    outb(PORT_CMD, SIGNAL_DONE);
}


// ----------------------------------------------------------------------------
// PUBLIC FUNCTIONS
// ----------------------------------------------------------------------------

/**
 * @brief Main entry point for the guest enclave.
 */
__attribute__((section(".text.entry")))
void _start() {
    _bootstrap_virtual_memory();
    outb(PORT_CMD, SIGNAL_READY);

    while (1) {
        uint8_t cmd = inb(PORT_DATA);
        if (cmd == 0) continue;

        switch (cmd) {
            case CMD_GET_PUBKEY:
                _handle_get_pubkey();
                break;

            case CMD_MINT_NFT:
                _handle_mint_nft();
                break;

            case CMD_WITHDRAW_FUNDS:
                _handle_withdraw_funds();
                break;

            case CMD_CHECK_SANCTIONS:
                _handle_check_sanctions();

            case CMD_ABORT_MINT:
                _handle_abort_mint();

            default:
                handle_maintenance(cmd);
                break;
        }
    }
}