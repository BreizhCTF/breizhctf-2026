#ifndef RSA_H
#define RSA_H

#include "bn.h"
#include <protocol.h>

/**
 * @brief Performs an RSA-CRT signature.
 * @param msg The 32-byte message to sign.
 * @param sig The 128-byte destination for the signature.
 * @param params Pointer to the static RSA parameters.
 * @param q_p Pointer to the volatile prime Q parameters.
 */
void rsa_crt_sign(const uint8_t *msg, uint8_t *sig, const struct rsa_params *params, const struct q_params *q_p);

/**
 * @brief Verifies an RSA signature.
 * @param msg The original message.
 * @param sig The signature to verify.
 * @param params Pointer to the static RSA parameters.
 * @return 1 if valid, 0 if invalid.
 */
int rsa_verify(const uint8_t *msg, const uint8_t *sig, const struct rsa_params *params);

#endif
