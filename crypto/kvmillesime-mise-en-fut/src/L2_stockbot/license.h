#pragma once
#include <stdint.h>

int validate_license(uint8_t *p_license_key);
int is_licensed();
void set_licensed(int val);
