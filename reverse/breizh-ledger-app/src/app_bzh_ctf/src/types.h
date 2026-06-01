#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "constants.h"

/**
 * APDU instruction codes.
 */
typedef enum {
    GET_VERSION    = 0x03,
    GET_APP_NAME   = 0x04,
    STEP_INIT      = 0x10,
    STEP_KEY       = 0x11,
    STEP_CONFIG    = 0x12,
    STEP_VERIFY    = 0x13,
    STEP_ARM       = 0x14,
    PRINT_FLAG     = 0x20,
    SET_FLAG       = 0xFF,
} command_e;

/**
 * Internal state machine states (stored as uint8_t in the binary).
 */
#define SM_IDLE        0
#define SM_INIT        1
#define SM_KEY_LOADED  2
#define SM_CONFIGURED  3
#define SM_VERIFIED    4
#define SM_ARMED       5

typedef struct {
    uint8_t  sm_state;
    uint8_t  accum[8];
    bool     flag_loaded;
    char     flag_plaintext[FLAG_SIZE];
} global_ctx_t;
