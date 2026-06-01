#ifndef IO_H
#define IO_H

#include "types.h"

/**
 * @brief I/O Port Definitions
 */
#define PORT_DATA 0x11

/**
 * @brief Writes an 8-bit byte to a 16-bit I/O port.
 * @param port The port address.
 * @param val The value to write.
 */
static inline void outb(uint16_t port, uint8_t val) {
    __asm__ volatile ("outb %0, %1" : : "a"(val), "Nd"(port));
}

/**
 * @brief Reads an 8-bit byte from a 16-bit I/O port.
 * @param port The port address.
 * @return The 8-bit value read.
 */
static inline uint8_t inb(uint16_t port) {
    uint8_t val;
    __asm__ volatile ("inb %1, %0" : "=a"(val) : "Nd"(port));
    return val;
}

/**
 * @brief Sends a contiguous buffer of bytes to the data port.
 * @param buf Pointer to the source buffer.
 * @param n Number of bytes to transmit.
 */
static inline void send_bytes(const uint8_t *buf, int n) {
    for (int i = 0; i < n; i++) {
        outb(PORT_DATA, buf[i]);
    }
}

/**
 * @brief Receives a fixed number of bytes from the data port.
 * @param buf Pointer to the destination buffer.
 * @param n Number of bytes to receive.
 */
static inline void recv_bytes(uint8_t *buf, int n) {
    for (int i = 0; i < n; i++) {
        buf[i] = inb(PORT_DATA);
    }
}

#endif
