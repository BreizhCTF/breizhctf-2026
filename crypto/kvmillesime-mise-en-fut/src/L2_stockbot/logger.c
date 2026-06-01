#include "logger.h"
#include "hex_utils.h"
#include "smallstring.h"
#include "io.h"

#define LOG_SIZE 0x800000 // 4KB de logs max
static char g_log_db[LOG_SIZE] = {0};
static int g_log_idx = 0;

void log_append(uint64_t timestamp, char* msg) {
    char timestamp_str[20] = {0}; // Assez grand pour "0x" + 8 chars + \0
    int2hexstring(timestamp, timestamp_str);
    
    int ts_len = my_strlen(timestamp_str);
    int msg_len = my_strlen(msg);
    int separator_len = 3; // " | "
    int newline_len = 1;   // "\n"

    int total_len = ts_len + separator_len + msg_len + newline_len;

    if (g_log_idx + total_len >= LOG_SIZE) {
        return; 
    }

    my_memcpy(&g_log_db[g_log_idx], timestamp_str, ts_len);
    g_log_idx += ts_len;

    my_memcpy(&g_log_db[g_log_idx], " | ", 3);
    g_log_idx += separator_len;

    my_memcpy(&g_log_db[g_log_idx], msg, msg_len);
    g_log_idx += msg_len;

    g_log_db[g_log_idx] = '\n';
    g_log_idx += 1;

    if (g_log_idx < LOG_SIZE) {
        g_log_db[g_log_idx] = 0;
    } else {
        g_log_db[LOG_SIZE - 1] = 0;
    }
}

void show_log(int num_lines) {
    print("------------\n");
    
    if (g_log_idx > 0 && num_lines > 0) {
        int count = 0;
        int i = g_log_idx - 1;
        
        // Skip trailing newline if it's the very last character
        if (i >= 0 && g_log_db[i] == '\n') {
            i--;
        }

        while (i >= 0 && count < num_lines) {
            if (g_log_db[i] == '\n') {
                count++;
            }
            if (count < num_lines) {
                i--;
            }
        }
        
        // i is now either -1 or at the (num_lines)th newline from the end
        print(&g_log_db[i + 1]);
    }

    print("------------\n");
}
