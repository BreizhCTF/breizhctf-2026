#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/mman.h>
#include <sys/mount.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <dirent.h>

#define PCI_VENDOR_ID "0x1337"
#define PCI_DEVICE_ID "0x0042"

#if defined(__aarch64__)
    #define UART_PATH "/dev/ttyAMA0"
#else
    #define UART_PATH "/dev/ttyS0"
#endif

volatile uint64_t *mmio_ptr;

void setup_system() {
    mkdir("/proc", 0755);
    mkdir("/sys", 0755);
    mkdir("/dev", 0755);
    mount("none", "/proc", "proc", 0, NULL);
    mount("none", "/sys", "sysfs", 0, NULL);
    mount("none", "/dev", "devtmpfs", 0, NULL);
}

void find_and_enable_pci_device() {
    DIR *d;
    struct dirent *dir;
    char path[256];
    char vendor[16], device[16];
    int found = 0;

    d = opendir("/sys/bus/pci/devices");
    if (!d) exit(1);

    while ((dir = readdir(d)) != NULL) {
        if (dir->d_name[0] == '.') continue;
        snprintf(path, sizeof(path), "/sys/bus/pci/devices/%s/vendor", dir->d_name);
        FILE *fv = fopen(path, "r");
        if (!fv) continue;
        fgets(vendor, sizeof(vendor), fv);
        fclose(fv);
        snprintf(path, sizeof(path), "/sys/bus/pci/devices/%s/device", dir->d_name);
        FILE *fd = fopen(path, "r");
        if (!fd) continue;
        fgets(device, sizeof(device), fd);
        fclose(fd);
        if (strncmp(vendor, PCI_VENDOR_ID, 6) == 0 && strncmp(device, PCI_DEVICE_ID, 6) == 0) {
            snprintf(path, sizeof(path), "/sys/bus/pci/devices/%s/enable", dir->d_name);
            FILE *fe = fopen(path, "w");
            if (fe) { fprintf(fe, "1"); fclose(fe); }
            snprintf(path, sizeof(path), "/sys/bus/pci/devices/%s/resource0", dir->d_name);
            int fd_res = open(path, O_RDWR);
            if (fd_res < 0) exit(1);
            mmio_ptr = mmap(NULL, 4096, PROT_READ | PROT_WRITE, MAP_SHARED, fd_res, 0);
            if (mmio_ptr == MAP_FAILED) exit(1);
            found = 1;
            break;
        }
    }
    closedir(d);
    if (!found) exit(1);
}

void main_loop() {
    char buf[128];
    FILE *uart = fopen(UART_PATH, "r+");
    if (!uart) exit(1);
    setvbuf(uart, NULL, _IONBF, 0);
    printf("Ready to process commands.\n");
    while (1) {
        if (fgets(buf, sizeof(buf), uart) == NULL) break;
        buf[strcspn(buf, "\n")] = 0;
        if (strncmp(buf, "GET", 3) == 0) {
            fprintf(uart, "%016lx\n", *mmio_ptr);
        } else if (strncmp(buf, "PING", 4) == 0) {
             fprintf(uart, "PONG\n");
        } else if (strncmp(buf, "GUESS", 4) == 0) {
            if(fgets(buf, sizeof(buf), uart) == NULL) break; 
            uint64_t guess = strtoul(buf, NULL, 16);
            *(mmio_ptr + 1) = guess;
            uint32_t status = *((uint32_t *)(mmio_ptr + 2));
            if (status) fprintf(uart, "USER_AUTHENTIFIED\n");
            else fprintf(uart, "FAIL\n");
        }
    }
}

int main() {
    setvbuf(stdout, NULL, _IONBF, 0);
    printf("Starting Ascending Service (PID 1)...\n");
    setup_system();
    find_and_enable_pci_device();
    main_loop();
    return 0;
}
