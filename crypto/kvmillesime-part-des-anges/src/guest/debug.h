#ifndef DEBUG_H
#define DEBUG_H

#include "types.h"

/**
 * @brief Handles maintenance commands dispatched from the main loop or sanctions loop.
 * @param cmd The command byte.
 */
void handle_maintenance(uint8_t cmd);

#endif
