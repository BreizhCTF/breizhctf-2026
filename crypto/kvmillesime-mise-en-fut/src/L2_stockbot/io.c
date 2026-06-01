#include "io.h"
#include "hex_utils.h"
#include "smallstring.h"


void putc(char c) {
    outb(COM1, c);
}

char getc() {
    return inb(COM1);
}

void print(char* msg) {
    char c = msg[0];
    while(c) {
        putc(c);
        c = *(++msg);
    }
}

void print_int(int n) {
    char buf[12];
    my_itoa(n, buf);
    print(buf);
}

void readline(char *buf, int max) {
    int i = 0;
    while (i < max - 1) {
        char c = getc();
        if (c == '\r' || c == '\n') {
            putc('\n');
            break;
        }
        if (c == '\b' || c == 127) {
            if (i > 0) {
                i--;
                print("\b \b");
            }
            continue;
        }
        buf[i++] = c;
        putc(c);
    }
    buf[i] = '\0';
}






void scan(uint8_t *dest, int maxLen) {
    int idx = 0, max = 0;
    char hexc = 0, tmp = 0;
    char c = -1;

    while(idx < maxLen) {
        c = inb(COM1);
        c = hexchar2int(c);
        if (c == -1)  break; 
        hexc = c;

        c = inb(COM1);
        c = hexchar2int(c);
        if (c == -1)  break;

        hexc = hexc << 4 | c;
        dest[idx] = hexc;
        idx += 1;
    }

    // Reverse the number, so it's in the right order in the kernel
    idx--;
    max = idx;
    while(idx > max /2 ) {
        tmp = dest[idx];
        dest[idx] = dest[max-idx];
        dest[max-idx] = tmp;
        idx --;
    }
}