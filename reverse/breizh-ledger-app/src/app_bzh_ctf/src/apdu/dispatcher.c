#include <stdint.h>
#include <stdbool.h>

#include "io.h"
#include "ledger_assert.h"

#include "dispatcher.h"
#include "constants.h"
#include "types.h"
#include "sw.h"
#include "get_version.h"
#include "get_app_name.h"
#include "state_machine.h"

int apdu_dispatcher(const command_t *cmd) {
    LEDGER_ASSERT(cmd != NULL, "NULL cmd");

    if (cmd->cla != CLA) {
        return io_send_sw(SWO_INVALID_CLA);
    }

    switch (cmd->ins) {
        case GET_VERSION:
            if (cmd->p1 != 0 || cmd->p2 != 0) {
                return io_send_sw(SWO_INCORRECT_P1_P2);
            }
            return handler_get_version();

        case GET_APP_NAME:
            if (cmd->p1 != 0 || cmd->p2 != 0) {
                return io_send_sw(SWO_INCORRECT_P1_P2);
            }
            return handler_get_app_name();

        /* All state-machine INS codes route to the same handler */
        case STEP_INIT:
        case STEP_KEY:
        case STEP_CONFIG:
        case STEP_VERIFY:
        case STEP_ARM:
        case PRINT_FLAG:
        case SET_FLAG:
            return handler_state_machine(cmd);

        default:
            return io_send_sw(SWO_INVALID_INS);
    }
}
