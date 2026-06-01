#ifndef PROTOCOL_H
#define PROTOCOL_H

/* Use custom types for guest to avoid host libc dependencies in -nostdlib mode */
#ifdef GUEST
typedef unsigned char uint8_t;
typedef unsigned short uint16_t;
typedef unsigned int uint32_t;
typedef unsigned long long uint64_t;
#else
#include <stdint.h>
#endif

/**
 * @brief Memory Layout Constants
 */
#define PAGE_DIR_ADDR          0x4000
#define PAGE_TABLE_ADDR        0x5000
#define CONFIG_REGION_ADDR     0x7000   // Static RSA params (p, dp, qInv, n, e)
#define SCRATCHPAD_VIRT_ADDR   0x8000   // Volatile RSA params (q, dq)
#define SCRATCHPAD_SIZE        4096

/**
 * @brief I/O Port Definitions
 */
#define PORT_CMD           0x10
#define PORT_DATA          0x11
#define PORT_DEBUG         0x12
#define PORT_SECURE_ELEMENT     0x13
#define PORT_STATUS        0x14

/**
 * @brief Protocol Command Codes
 */
#define CMD_GET_PUBKEY      0x01
#define CMD_MINT_NFT        0x02
#define CMD_BEGIN_MINDFULNESS     0x03
#define CMD_WITHDRAW_FUNDS  0x04
#define CMD_CHECK_SANCTIONS 0x05
#define CMD_RESEED_PRNG     0x06
#define CMD_STATUS_CHECK    0x07
#define CMD_ABORT_MINT      0x08

/**
 * @brief Protocol Signal Codes
 */
#define SIGNAL_READY              0xEE
#define SIGNAL_DONE               0xFF
#define SIGNAL_INTERMEDIATE_FLUSH 0xFE

/**
 * @brief Status Codes
 */
#define STATUS_BAD_SIGNATURE      0x1
#define STATUS_ACCESS_DENIED      0x37
#define STATUS_ACCESS_GRANTED     0x42

/**
 * @brief Page Table Entry Flags
 */
#define PTE_PRESENT_WRITABLE_USER 0x07

/**
 * @struct rsa_params
 * @brief Static RSA configuration region.
 */
struct rsa_params {
    uint32_t n[64];
    uint32_t e;
    uint32_t p[64];
    uint32_t dp[64];
    uint32_t qInv[64];
};

/**
 * @struct q_params
 * @brief Volatile RSA Q parameters.
 */
struct q_params {
    uint32_t q[64];
    uint32_t dq[64];
};

#endif
