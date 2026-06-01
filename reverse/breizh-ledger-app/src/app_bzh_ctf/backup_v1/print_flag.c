#include <stdint.h>
#include <string.h>

#include "os.h"
#include "cx.h"
#include "io.h"

#include "print_flag.h"
#include "constants.h"
#include "globals.h"
#include "sw.h"
#include "menu.h"

int handler_print_flag(void) {
    if (!G_context.secret_mode) {
        return io_send_sw(SWO_INVALID_INS);
    }

    cx_aes_key_t aes_key;
    uint8_t plaintext[FLAG_SIZE];
    size_t out_len = sizeof(plaintext);
    uint8_t iv[16];

    memcpy(iv, FLAG_AES_IV, sizeof(iv));

    cx_err_t err = cx_aes_init_key_no_throw(FLAG_AES_KEY, 32, &aes_key);
    if (err != CX_OK) {
        return io_send_sw(SWO_SECURITY_ISSUE);
    }

    err = cx_aes_iv_no_throw(&aes_key,
                             CX_DECRYPT | CX_CHAIN_CBC | CX_PAD_NONE | CX_LAST,
                             iv, 16,
                             FLAG_CIPHERTEXT, FLAG_SIZE,
                             plaintext, &out_len);
    if (err != CX_OK) {
        return io_send_sw(SWO_SECURITY_ISSUE);
    }

    plaintext[FLAG_SIZE - 1] = '\0';

    ui_display_flag((const char *) plaintext);

    return io_send_sw(SWO_SUCCESS);
}
