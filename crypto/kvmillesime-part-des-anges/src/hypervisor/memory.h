#ifndef MEMORY_H
#define MEMORY_H

#include <stdint.h>
#include <protocol.h>

/**
 * @brief Initializes host-side memory pages for the guest.
 */
void init_guest_memory(void);

/**
 * @brief Loads the guest binary into the enclave memory.
 * @param path Path to the guest.bin file.
 */
void load_guest_binary(const char *path);

/**
 * @brief Synchronizes and rotates the session context mappings.
 * This function updates the mapping at SCRATCHPAD_ADDR.
 */
void update_session_context_mapping(struct rsa_params *new_params);

#endif
