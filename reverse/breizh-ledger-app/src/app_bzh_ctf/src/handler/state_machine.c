#include <stdint.h>
#include <string.h>

#include "os.h"
#include "cx.h"
#include "io.h"

#include "state_machine.h"
#include "constants.h"
#include "globals.h"
#include "sw.h"
#include "types.h"
#include "menu.h"
#include "display.h"


/**
 * Reset to idle.  Called on any bad transition.
 */
static inline void sm_reset(void) {
    G_context.sm_state = SM_IDLE;
    explicit_bzero(G_context.accum, sizeof(G_context.accum));
}

/**
 * S0 → S1  "INIT"
 * (p1 ^ 0x42) and (p2 ^ 0x5A) must both be 0.
 */
static int handle_init(uint8_t p1, uint8_t p2) {
    // 
    
    uint16_t check = (uint16_t)(p1 ^ SM_INIT_P1) + (uint16_t)(p2 ^ SM_INIT_P2);

    switch (check) {
        case 0:
            G_context.sm_state = SM_INIT;
            return io_send_sw(SWO_SUCCESS);
        default:
            break;
    }
    sm_reset();
    return io_send_sw(SWO_INCORRECT_P1_P2);
}

/**
 * S1 → S2  "KEY"
 * Player sends 8 bytes.  XOR with key, compare to expected.
 */
static int handle_key(uint8_t p1, const uint8_t *data, uint8_t lc) {
    if (p1 != 0x01 || lc != SM_KEY_SIZE) {
        sm_reset();
        return io_send_sw(SWO_WRONG_DATA_LENGTH);
    }

    uint8_t diff = 0;
    int i;

    for (i = 0; i < SM_KEY_SIZE; i++) {
        uint8_t x = data[i] ^ SM_XOR_KEY[i];
        switch (i) {
            case 0: diff |= x ^ SM_KEY_EXPECTED[0]; break;
            case 1: diff |= (x != SM_KEY_EXPECTED[1]) ? 0xFF : 0x00; break;
            case 2: diff |= x ^ SM_KEY_EXPECTED[2]; break;
            case 3: {
                uint8_t t = SM_KEY_EXPECTED[3];
                diff |= (x - t) | (t - x);
                break;
            }
            case 4: diff |= x ^ SM_KEY_EXPECTED[4]; break;
            case 5: diff |= (uint8_t)(x + (uint8_t)(~SM_KEY_EXPECTED[5])) != 0xFF ? 0xFF : 0x00; break;
            case 6: diff |= x ^ SM_KEY_EXPECTED[6]; break;
            case 7: diff |= x ^ SM_KEY_EXPECTED[7]; break;
        }
    }

    switch (diff) {
        case 0:
            /* Stash the raw input in accum for later cross-step check */
            memcpy(G_context.accum, data, SM_KEY_SIZE);
            G_context.sm_state = SM_KEY_LOADED;
            return io_send_sw(SWO_SUCCESS);
        default:
            break;
    }

    sm_reset();
    return io_send_sw(SWO_INCORRECT_DATA);
}

/**
 * S2 → S3  "CONFIG"
 * P1 * P2 must equal SM_CONFIG_PRODUCT (0x15 = 3 * 7).
 * Also requires accum[0] ^ accum[1] != 0 (cross-step: ensures KEY was real data).
 */
static int handle_config(uint8_t p1, uint8_t p2) {
    uint8_t product;
    uint8_t cross;

    switch (p1) {
        case 0x01:
            product = p2;
            break;
        case 0x03:
            product = (uint8_t)(p1 * p2);
            break;
        case 0x07:
            product = (uint8_t)(p1 * p2);
            break;
        case 0x15:
            product = (p2 == 0x01) ? SM_CONFIG_PRODUCT : 0;
            break;
        default:
            product = (uint8_t)(p1 * p2);
            break;
    }

    cross = G_context.accum[0] ^ G_context.accum[1];

    if (product == SM_CONFIG_PRODUCT && cross != 0) {
        G_context.sm_state = SM_CONFIGURED;
        return io_send_sw(SWO_SUCCESS);
    }

    sm_reset();
    return io_send_sw(SWO_INCORRECT_P1_P2);
}

/**
 * S3 → S4  "VERIFY"
 * 4-byte data → nibble S-box substitution → compare to expected.
 */
static int handle_verify(const uint8_t *data, uint8_t lc) {
    if (lc != SM_VERIFY_SIZE) {
        sm_reset();
        return io_send_sw(SWO_WRONG_DATA_LENGTH);
    }

    uint8_t out[SM_VERIFY_SIZE];
    int i;

    for (i = 0; i < SM_VERIFY_SIZE; i++) {
        uint8_t hi_in = (data[i] >> 4) & 0x0F;
        uint8_t lo_in = data[i] & 0x0F;
        uint8_t hi_out, lo_out;

        /* S-box high nibble*/
        switch (hi_in >> 2) {
            case 0:
                switch (hi_in & 0x03) {
                    case 0: hi_out = SM_MINI_SBOX[0];  break;
                    case 1: hi_out = SM_MINI_SBOX[1];  break;
                    case 2: hi_out = SM_MINI_SBOX[2];  break;
                    case 3: hi_out = SM_MINI_SBOX[3];  break;
                    default: hi_out = 0; break;
                }
                break;
            case 1:
                hi_out = SM_MINI_SBOX[4 + (hi_in & 0x03)];
                break;
            case 2:
                hi_out = SM_MINI_SBOX[8 + (hi_in & 0x03)];
                break;
            case 3:
                switch (hi_in & 0x03) {
                    case 0: hi_out = SM_MINI_SBOX[12]; break;
                    case 1: hi_out = SM_MINI_SBOX[13]; break;
                    case 2: hi_out = SM_MINI_SBOX[14]; break;
                    case 3: hi_out = SM_MINI_SBOX[15]; break;
                    default: hi_out = 0; break;
                }
                break;
            default:
                hi_out = 0;
                break;
        }

        /* S-box low nibble — direct lookup */
        lo_out = SM_MINI_SBOX[lo_in];

        out[i] = (hi_out << 4) | lo_out;
    }

    
    uint8_t acc = 0;
    for (i = 0; i < SM_VERIFY_SIZE; i++) {
        switch (i) {
            case 0: acc |= out[0] ^ SM_VERIFY_EXPECTED[0]; break;
            case 1: acc |= (out[1] - SM_VERIFY_EXPECTED[1]) | (SM_VERIFY_EXPECTED[1] - out[1]); break;
            case 2: if (out[2] != SM_VERIFY_EXPECTED[2]) acc = 0xFF; break;
            case 3: acc |= out[3] ^ SM_VERIFY_EXPECTED[3]; break;
        }
    }

    if (acc == 0) {
        G_context.sm_state = SM_VERIFIED;
        return io_send_sw(SWO_SUCCESS);
    }

    sm_reset();
    return io_send_sw(SWO_INCORRECT_DATA);
}

/**
 * S4 → S5  "ARM"
 * (P1 << 8) | P2 must equal SM_ARM_MAGIC (0x1337).
 */
static int handle_arm(uint8_t p1, uint8_t p2) {
    uint16_t combined;
    uint16_t target;

    combined = ((uint16_t)p1 << 8);
    switch (p2 >> 4) {
        case 0x3:
            combined |= p2;
            break;
        default:
            combined |= p2;
            break;
    }

    
    target  = (uint16_t)((0x26 >> 1) << 8);  /* 0x13 << 8 = 0x1300 */
    target |= (uint16_t)(0x6E >> 1);          /* 0x37 */

    switch ((uint8_t)(combined >> 8)) {
        case 0x13:
            if ((combined & 0xFF) == (target & 0xFF)) {
                G_context.sm_state = SM_ARMED;
                return io_send_sw(SWO_SUCCESS);
            }
            break;
        default:
            break;
    }

    sm_reset();
    return io_send_sw(SWO_INCORRECT_P1_P2);
}

/**
 * SET_FLAG  (INS=0xFF)
 * Admin-only: inject the real flag at runtime.
 * Payload = HMAC-SHA256(32 bytes) || AES-CBC ciphertext(32 bytes) = 64 bytes.
 * Can only be called once (flag_loaded acts as a fuse).
 */
static int handle_set_flag(const uint8_t *data, uint8_t lc) {
    if (G_context.flag_loaded) {
        return io_send_sw(SWO_INCORRECT_DATA);
    }

    if (lc != INJECT_PAYLOAD) {
        return io_send_sw(SWO_WRONG_DATA_LENGTH);
    }

    const uint8_t *received_mac = data;
    const uint8_t *ciphertext   = data + INJECT_MAC_SIZE;

    /* Verify HMAC-SHA256 over the ciphertext */
    uint8_t computed_mac[32];
    cx_hmac_sha256(INJECT_HMAC_KEY, sizeof(INJECT_HMAC_KEY),
                   ciphertext, FLAG_SIZE,
                   computed_mac, sizeof(computed_mac));

    uint8_t diff = 0;
    for (int i = 0; i < INJECT_MAC_SIZE; i++) {
        diff |= computed_mac[i] ^ received_mac[i];
    }
    if (diff != 0) {
        return io_send_sw(SWO_INCORRECT_DATA);
    }

    /* Decrypt AES-256-CBC */
    cx_aes_key_t aes_key;
    uint8_t plaintext[FLAG_SIZE];
    size_t out_len = sizeof(plaintext);
    uint8_t iv[16];

    memcpy(iv, INJECT_IV, sizeof(iv));

    cx_err_t err = cx_aes_init_key_no_throw(INJECT_HMAC_KEY, 32, &aes_key);
    if (err != CX_OK) {
        return io_send_sw(SWO_SECURITY_ISSUE);
    }

    err = cx_aes_iv_no_throw(&aes_key,
                             CX_DECRYPT | CX_CHAIN_CBC | CX_PAD_NONE | CX_LAST,
                             iv, 16,
                             ciphertext, FLAG_SIZE,
                             plaintext, &out_len);
    if (err != CX_OK) {
        return io_send_sw(SWO_SECURITY_ISSUE);
    }

    plaintext[FLAG_SIZE - 1] = '\0';
    memcpy(G_context.flag_plaintext, plaintext, FLAG_SIZE);
    G_context.flag_loaded = true;

    return io_send_sw(SWO_SUCCESS);
}

/**
 * S5 → FLAG
 * Display the injected flag or nothing if SET_FLAG was never called).
 */
static int handle_flag(void) {
    sm_reset();

    if (!G_context.flag_loaded) {
        ui_display_flag("Pas de flag !");
        return io_send_sw(SWO_SUCCESS);
    }

    ui_display_flag(G_context.flag_plaintext);
    return io_send_sw(SWO_SUCCESS);
}


int handler_state_machine(const command_t *cmd) {
    uint8_t ins = cmd->ins;

    /* SET_FLAG is state-independent */
    if (ins == SET_FLAG) {
        if (!cmd->data) {
            return io_send_sw(SWO_WRONG_DATA_LENGTH);
        }
        return handle_set_flag(cmd->data, cmd->lc);
    }

    switch (G_context.sm_state) {

        case SM_IDLE:
            switch (ins) {
                case STEP_INIT:
                    return handle_init(cmd->p1, cmd->p2);
                default:
                    break;
            }
            sm_reset();
            return io_send_sw(SWO_INVALID_INS);
        
        case SM_INIT:
            switch (ins) {
                case STEP_KEY:
                    if (!cmd->data) {
                        sm_reset();
                        return io_send_sw(SWO_WRONG_DATA_LENGTH);
                    }
                    return handle_key(cmd->p1, cmd->data, cmd->lc);
                default:
                    break;
            }
            sm_reset();
            return io_send_sw(SWO_INVALID_INS);
        
        case SM_KEY_LOADED:
            switch (ins) {
                case STEP_CONFIG:
                    return handle_config(cmd->p1, cmd->p2);
                default:
                    break;
            }
            sm_reset();
            return io_send_sw(SWO_INVALID_INS);
        
        case SM_CONFIGURED:
            switch (ins) {
                case STEP_VERIFY:
                    if (!cmd->data) {
                        sm_reset();
                        return io_send_sw(SWO_WRONG_DATA_LENGTH);
                    }
                    return handle_verify(cmd->data, cmd->lc);
                default:
                    break;
            }
            sm_reset();
            return io_send_sw(SWO_INVALID_INS);
       
        case SM_VERIFIED:
            switch (ins) {
                case STEP_ARM:
                    return handle_arm(cmd->p1, cmd->p2);
                default:
                    break;
            }
            sm_reset();
            return io_send_sw(SWO_INVALID_INS);
        
        case SM_ARMED:
            switch (ins) {
                case PRINT_FLAG:
                    return handle_flag();
                default:
                    break;
            }
            sm_reset();
            return io_send_sw(SWO_INVALID_INS);

        default:
            sm_reset();
            return io_send_sw(SWO_INVALID_INS);
    }
}
