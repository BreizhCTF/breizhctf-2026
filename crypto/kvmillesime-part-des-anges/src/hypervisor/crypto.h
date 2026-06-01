#ifndef CRYPTO_H
#define CRYPTO_H

#include "state.h"

/**
 * @brief Generates a new set of RSA session keys.
 * @param p Pointer to the target rsa_params structure.
 */
void generate_session_keys(struct rsa_params *p);

#endif
