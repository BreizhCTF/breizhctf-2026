#pragma once
#include <stdint.h>

void log_append(uint64_t timestamp, char* msg);
void show_log(int num_lines);
