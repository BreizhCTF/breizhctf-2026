#pragma once 
#include <stdint.h>

#define COM1 0x3f8

// Écrire un octet sur un port (OUTPUT)
static inline void outb(uint16_t port, uint8_t val) {
    asm volatile ( "outb %0, %1" : : "a"(val), "Nd"(port) );
}

// Lire un octet depuis un port (INPUT)
static inline uint8_t inb(uint16_t port) {
    uint8_t ret;
    asm volatile ( "inb %1, %0" : "=a"(ret) : "Nd"(port) );
    return ret;
}

void putc(char c);
char getc();
void print(char* msg);
void print_int(int n);
void readline(char *buf, int max);
void scan(uint8_t *dest, int maxLen);
