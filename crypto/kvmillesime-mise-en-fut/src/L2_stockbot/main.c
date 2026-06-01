#include "io.h"
#include "micro_times.h"
#include "smallstring.h"
#include "logger.h"
#include "license.h"
#include "stockbot.h"
#include "hex_utils.h"

#ifdef DEBUG
#define DEBUG_SECRET 1
#endif

#ifdef DEBUG_SECRET
void debug_secret() {
    uint8_t secret[16] = {0};
    int ret;
    asm volatile (
        "vmcall"
        : "=a"(ret)
        : "a"(0x1338), "b"(secret)
        : "memory"
    );
    if (ret == 0) {
        char buf[35]; 
        print("DEBUG_SECRET: ");
        int2hexstring(*(uint64_t*)(secret + 8), buf);
        print(buf);
        int2hexstring(*(uint64_t*)secret, buf);
        print(buf + 2); // Skip 0x
        print("\n");
    } else {
        print("DEBUG_SECRET: FAILED\n");
    }
}
#endif

int main() {
    char cmd_buf[50];
    print("STOCKBOT_BOOTING\n");
#ifdef DEBUG_SECRET
    debug_secret();
#endif
    show_banner();
    log_append(rdtsc(), "StockBot started");
    show_help();

    while (1) {
        print("> ");
        readline(cmd_buf, sizeof(cmd_buf));
        // print("You entered '");
        // print(cmd_buf);
        if (my_strcmp(cmd_buf, "exit") == 0) {
            log_append(rdtsc(), "StockBot exiting");
            break;
        } else if (my_strcmp(cmd_buf, "help") == 0) {
            show_help();
        } else if (my_strncmp(cmd_buf, "logs", 4) == 0) {
            int num_lines = 20; // Default
            if (cmd_buf[4] == ' ') {
                num_lines = my_atoi(cmd_buf + 5);
            }
            if (num_lines <= 0) num_lines = 20;
            show_log(num_lines);
        } else if (my_strcmp(cmd_buf, "license") == 0) {
            uint8_t license[16] = {0};
            print("Please enter 32 hex characters for the license key:\n");
            scan(license, 16);
            if (validate_license(license) == 0) {
                set_licensed(1);
                print("Welcome, licensed user.\n");
            } else {
                print("Invalid license.\n");
            }
        
        } else {
            if (!is_licensed()) {
                print("Invalid command or Unauthorized access. Please call 'license' first.\n");
                continue;
            }

            if (my_strcmp(cmd_buf, "list") == 0) {
                list_stocks();
            } else if (my_strncmp(cmd_buf, "buy ", 4) == 0) {
                buy_stock(cmd_buf);
            } else if (my_strcmp(cmd_buf, "balance") == 0) {
                show_balance();
            } else if (my_strcmp(cmd_buf, "ai-optimize") == 0) {
                ai_optimize();
            } else if (my_strcmp(cmd_buf, "admin_token") == 0) {
                show_flag();
            } else if (cmd_buf[0] != '\0') {
                print("Unknown command: ");
                print(cmd_buf);
                print("\nType 'help' for available commands.\n");
            }
        }
    }

    return 0;
}
