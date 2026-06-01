#include <stdio.h>
#include <stdlib.h>

int main(void) {
    FILE *f = fopen("/flag.txt", "r");
    if (!f) {
        perror("fopen");
        return 1;
    }

    char buf[1024];
    size_t n;

    while ((n = fread(buf, 1, sizeof(buf), f)) > 0) {
        fwrite(buf, 1, n, stdout);
    }

    fclose(f);
    return 0;
}