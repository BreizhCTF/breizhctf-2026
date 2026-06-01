#include <openssl/evp.h>
#include <openssl/bn.h>
#include <openssl/core_names.h>
#include <string.h>
#include <stdio.h>
#include "crypto.h"
#include "state.h"
#include "memory.h"

/**
 * @brief Utility to convert an OpenSSL BIGNUM to a fixed-size limb array.
 */
static void _export_bn_to_limbs(const BIGNUM *bn, uint32_t *limbs) {
    if (!bn) return;
    memset(limbs, 0, 64 * sizeof(uint32_t));
    BN_bn2lebinpad(bn, (unsigned char *)limbs, 64 * sizeof(uint32_t));
}

/**
 * @brief Extracts RSA parameters from an EVP_PKEY and populates the session structs.
 */
static void _extract_rsa_components(EVP_PKEY *pkey, struct rsa_params *params) {
    BIGNUM *n_bn = NULL, *p_bn = NULL, *q_bn = NULL, *dp_bn = NULL, *dq_bn = NULL, *qi_bn = NULL;

    EVP_PKEY_get_bn_param(pkey, OSSL_PKEY_PARAM_RSA_N, &n_bn);
    EVP_PKEY_get_bn_param(pkey, OSSL_PKEY_PARAM_RSA_FACTOR1, &p_bn);
    EVP_PKEY_get_bn_param(pkey, OSSL_PKEY_PARAM_RSA_FACTOR2, &q_bn);
    EVP_PKEY_get_bn_param(pkey, OSSL_PKEY_PARAM_RSA_EXPONENT1, &dp_bn);
    EVP_PKEY_get_bn_param(pkey, OSSL_PKEY_PARAM_RSA_EXPONENT2, &dq_bn);
    EVP_PKEY_get_bn_param(pkey, OSSL_PKEY_PARAM_RSA_COEFFICIENT1, &qi_bn);


    _export_bn_to_limbs(n_bn, params->n);
    params->e = 65537;
    _export_bn_to_limbs(p_bn, params->p);
    _export_bn_to_limbs(dp_bn, params->dp);
    _export_bn_to_limbs(qi_bn, params->qInv);
    
    _export_bn_to_limbs(q_bn, state.real_q_params.q);
    _export_bn_to_limbs(dq_bn, state.real_q_params.dq);

    BN_free(n_bn); BN_free(p_bn); BN_free(q_bn);
    BN_free(dp_bn); BN_free(dq_bn); BN_free(qi_bn);
}

// ----------------------------------------------------------------------------
// PUBLIC FUNCTIONS
// ----------------------------------------------------------------------------

void generate_session_keys(struct rsa_params *p) {
    EVP_PKEY *pkey = EVP_PKEY_Q_keygen(NULL, NULL, "RSA", (size_t)1024);
    if (!pkey) return;

    _extract_rsa_components(pkey, p);
    update_session_context_mapping(p);

    EVP_PKEY_free(pkey);
}
