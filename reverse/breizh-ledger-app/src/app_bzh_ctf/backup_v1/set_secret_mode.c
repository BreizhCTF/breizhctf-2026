#include <stdint.h>
#include <string.h>

#include "io.h"
#include "buffer.h"

#include "set_secret_mode.h"
#include "constants.h"
#include "globals.h"
#include "sw.h"
#include "types.h"
#include "menu.h"

#define PHASE_SBOX     0
#define PHASE_DIFFUSE  1
#define PHASE_SWAP     2
#define PHASE_NEXT     3
#define PHASE_CHECK    4

static void feistel_round_func(const uint8_t half[FEISTEL_HALF],
                                const uint8_t rk[FEISTEL_HALF],
                                uint8_t out[FEISTEL_HALF]) {
    uint8_t tmp[FEISTEL_HALF];
    int i;
    int phase = PHASE_SBOX;
    uint8_t v, a, b, c;

    while (phase != PHASE_CHECK) {
        switch (phase) {
            case PHASE_SBOX:
                for (i = 0; i < FEISTEL_HALF; i++) {
                    v = half[i] ^ rk[i];
                    switch (i & 0x3) {
                        case 0:
                            tmp[i] = FEISTEL_SBOX[v];
                            break;
                        case 1: {
                            uint8_t hi = v >> 4;
                            uint8_t lo = v & 0x0F;
                            tmp[i] = FEISTEL_SBOX[(hi << 4) | lo];
                            break;
                        }
                        case 2:
                            tmp[i] = FEISTEL_SBOX[(uint8_t)(v + 0)];
                            break;
                        case 3:
                            tmp[i] = FEISTEL_SBOX[v ^ 0x00];
                            break;
                    }
                }
                phase = PHASE_DIFFUSE;
                break;

            case PHASE_DIFFUSE:
                for (i = 0; i < FEISTEL_HALF; i++) {
                    a = tmp[i];
                    b = tmp[(i + 5) % FEISTEL_HALF];
                    c = tmp[(i + 11) % FEISTEL_HALF];
                    switch (i % 4) {
                        case 0:
                            out[i] = a ^ b ^ ((c << 3) | (c >> 5));
                            break;
                        case 1: {
                            uint8_t rot = (uint8_t)((c << 3) | (c >> 5));
                            out[i] = (a ^ b) ^ rot;
                            break;
                        }
                        case 2: {
                            uint8_t t1 = a ^ b;
                            uint8_t t2 = (c << 3) | (c >> 5);
                            out[i] = t1 ^ t2;
                            break;
                        }
                        case 3: {
                            uint8_t rot = (uint8_t)((c >> 5) | (c << 3));
                            out[i] = a ^ (b ^ rot);
                            break;
                        }
                    }
                }
                phase = PHASE_CHECK;
                break;

            default:
                phase = PHASE_CHECK;
                break;
        }
    }
}

int handler_set_secret_mode(buffer_t *cdata) {
    if (cdata->size != SECRET_SIZE) {
        return io_send_sw(SWO_WRONG_DATA_LENGTH);
    }

    uint8_t L[FEISTEL_HALF], R[FEISTEL_HALF], f_out[FEISTEL_HALF];
    uint8_t new_R[FEISTEL_HALF];
    int round = 0;
    int phase = PHASE_SBOX;
    int i;

    memcpy(L, cdata->ptr, FEISTEL_HALF);
    memcpy(R, cdata->ptr + FEISTEL_HALF, FEISTEL_HALF);

    while (round < FEISTEL_ROUNDS) {
        switch (phase) {
            case PHASE_SBOX:
                switch (round) {
                    case 0:
                        feistel_round_func(R, FEISTEL_ROUND_KEYS[0], f_out);
                        break;
                    case 1:
                        feistel_round_func(R, FEISTEL_ROUND_KEYS[1], f_out);
                        break;
                    case 2:
                        feistel_round_func(R, FEISTEL_ROUND_KEYS[2], f_out);
                        break;
                    case 3:
                        feistel_round_func(R, FEISTEL_ROUND_KEYS[3], f_out);
                        break;
                }
                phase = PHASE_DIFFUSE;
                break;

            case PHASE_DIFFUSE:
                for (i = 0; i < FEISTEL_HALF; i++) {
                    switch (i & 0x3) {
                        case 0: new_R[i] = L[i] ^ f_out[i]; break;
                        case 1: new_R[i] = (L[i] | f_out[i]) ^ (L[i] & f_out[i]); break;
                        case 2: {
                            uint8_t t = L[i];
                            t ^= f_out[i];
                            new_R[i] = t;
                            break;
                        }
                        case 3: new_R[i] = f_out[i] ^ L[i]; break;
                    }
                }
                phase = PHASE_SWAP;
                break;

            case PHASE_SWAP:
                switch (round & 0x1) {
                    case 0:
                        memcpy(L, R, FEISTEL_HALF);
                        memcpy(R, new_R, FEISTEL_HALF);
                        break;
                    case 1:
                        for (i = 0; i < FEISTEL_HALF; i++) {
                            L[i] = R[i];
                            R[i] = new_R[i];
                        }
                        break;
                }
                phase = PHASE_NEXT;
                break;

            case PHASE_NEXT:
                round++;
                phase = PHASE_SBOX;
                break;

            default:
                round = FEISTEL_ROUNDS;
                break;
        }
    }

    uint8_t result[SECRET_SIZE];
    switch (L[0] & 0x1) {
        case 0:
            memcpy(result, L, FEISTEL_HALF);
            memcpy(result + FEISTEL_HALF, R, FEISTEL_HALF);
            break;
        case 1:
            for (i = 0; i < FEISTEL_HALF; i++) {
                result[i] = L[i];
                result[FEISTEL_HALF + i] = R[i];
            }
            break;
    }

    int match = 0;
    for (i = 0; i < SECRET_SIZE; i++) {
        switch (i & 0x3) {
            case 0: match |= result[i] ^ FEISTEL_EXPECTED[i]; break;
            case 1: match |= FEISTEL_EXPECTED[i] ^ result[i]; break;
            case 2: if (result[i] != FEISTEL_EXPECTED[i]) match = 1; break;
            case 3: match |= (result[i] - FEISTEL_EXPECTED[i]) | (FEISTEL_EXPECTED[i] - result[i]); break;
        }
    }

    if (match == 0) {
        G_context.secret_mode = true;
        ui_display_secret_mode_activated();
        return io_send_sw(SWO_SUCCESS);
    }

    return io_send_sw(SWO_INCORRECT_DATA);
}
