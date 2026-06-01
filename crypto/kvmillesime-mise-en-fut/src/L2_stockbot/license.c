#include "license.h"
#include "logger.h"
#include "micro_times.h"
#include "smallstring.h"

#define LICENSE_MAGIC 0x1337

static int g_is_licensed = 0;


int validate_license(uint8_t *p_license_key) {
    int ret;
    uint64_t timestamp; 
    uint32_t diagnostic_metric;

    timestamp = rdtsc();
    log_append(timestamp, "License check begin");

    asm volatile (
        "vmmcall"
        : "=a"(ret), "=d"(diagnostic_metric) 
        : "a"(LICENSE_MAGIC), "c"(p_license_key)
        : "memory"
    );

    timestamp = rdtsc();
    if (ret == 0) {
        log_append(timestamp, "License check succeeded");
    } else {
        log_append(timestamp, "License check failed");
    }

	char log_msg[70] = "TRADING_LATENCY_PROFILE: Inserted hardware wait state: ";
    char metric_str[20] = {0};
    my_itoa(diagnostic_metric, metric_str);
    
    
    int cur = my_strlen(log_msg);
    my_memcpy(log_msg + cur, metric_str, my_strlen(metric_str) + 1);
    
    log_append(timestamp, log_msg);
    return ret;
}

int is_licensed() {
    return g_is_licensed;
}

void set_licensed(int val) {
    g_is_licensed = val;
}
