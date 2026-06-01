#include "hex_utils.h"

int hexchar2int(char ch)
{
    if (ch >= '0' && ch <= '9')
        return ch - '0';
    if (ch >= 'A' && ch <= 'F')
        return ch - 'A' + 10;
    if (ch >= 'a' && ch <= 'f')
        return ch - 'a' + 10;
    return -1;
}


void int2hexstring(uint64_t val, char* dest) {
    char hex_chars[] = "0123456789ABCDEF";
    
    *dest++ = '0';
    *dest++ = 'x';

    for (int i = 15; i >= 0; i--) {
        int nibble = (val >> (i * 4)) & 0xF;
        *dest++ = hex_chars[nibble];
    }
    *dest = 0; // Null terminator
}
