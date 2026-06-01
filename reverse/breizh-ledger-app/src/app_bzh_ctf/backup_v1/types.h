#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "constants.h"

typedef enum {
    GET_VERSION = 0x03,
    GET_APP_NAME = 0x04,
    SET_SECRET_MODE = 0x10,
    PRINT_FLAG = 0x20,
} command_e;

typedef enum {
    STATE_NONE,
} state_e;

typedef struct {
    state_e state;
    bool secret_mode;
} global_ctx_t;
