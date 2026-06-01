#include "rsa.h"
#include "io.h"
#include "debug.h"
#include <protocol.h>

/**
 * @brief Local stack buffers for isolated constants.
 */
static bn_t _local_p, _local_dp, _local_qInv;

/**
 * @brief Static buffers for CRT components.
 */
static bn_t _m, _chakra_left, _chakra_right, _s_full;

/**
 * @brief Caches prime field constants from the shared config region to the stack.
 */
static void _isolate_prime_constants(const struct rsa_params *params) {
    bn_copy(&_local_p, (const bn_t *)params->p);
    bn_copy(&_local_dp, (const bn_t *)params->dp);
    bn_copy(&_local_qInv, (const bn_t *)params->qInv);
}

static void _wait_for_secure_element_sync(void) {
    outb(PORT_SECURE_ELEMENT, 1);
    while (inb(PORT_SECURE_ELEMENT) == 0) {
        if (inb(PORT_STATUS) == 1) {
            handle_maintenance(inb(PORT_DATA));
        }
    }
}

// ----------------------------------------------------------------------------
// PUBLIC FUNCTIONS
// ----------------------------------------------------------------------------

void rsa_crt_sign(const uint8_t *msg, uint8_t *sig, const struct rsa_params *params, const struct q_params *q_p) {
    bn_t h, m_mod_p, m_mod_q;
    _isolate_prime_constants(params);

    bn_clear(&_m);
    for (int i = 0; i < 128; i++) {
        _m.limbs[i / 4] |= ((uint32_t)msg[i]) << ((i % 4) * 8);
    }

    bn_copy(&m_mod_p, &_m);
    bn_mod(&m_mod_p, 32, &_local_p, 16);

    bn_clear(&_chakra_left);
    mod_exp(&_chakra_left, &m_mod_p, &_local_dp, &_local_p, 16);

    _wait_for_secure_element_sync();

    bn_copy(&m_mod_q, &_m);
    bn_mod(&m_mod_q, 32, (const bn_t *)q_p->q, 16);

    bn_clear(&_chakra_right);
    mod_exp(&_chakra_right, &m_mod_q, (const bn_t *)q_p->dq, (const bn_t *)q_p->q, 16);

    bn_sub(&h, &_chakra_left, &_chakra_right, 16);
    while (h.limbs[15] & 0x80000000) {
        bn_add(&h, h.limbs, _local_p.limbs, 16);
    }

    mod_mul(&h, &h, &_local_qInv, &_local_p, 16);

    bn_clear(&_s_full);
    bn_mul(&_s_full, &h, 16, (const bn_t *)q_p->q, 16);
    bn_add(&_s_full, _s_full.limbs, _chakra_right.limbs, 32);

    for (int i = 0; i < 128; i++) {
        sig[i] = (uint8_t)(_s_full.limbs[i / 4] >> ((i % 4) * 8));
    }
}

int rsa_verify(const uint8_t *msg, const uint8_t *sig, const struct rsa_params *params) {
    static bn_t s_limbs, m_ver, m_target, e_limbs;
    
    bn_clear(&s_limbs);
    for (int i = 0; i < 128; i++) {
        s_limbs.limbs[i / 4] |= ((uint32_t)sig[i]) << ((i % 4) * 8);
    }
    
    bn_clear(&e_limbs);
    e_limbs.limbs[0] = params->e;
    
    mod_exp(&m_ver, &s_limbs, &e_limbs, (const bn_t *)params->n, 32);
    
    bn_clear(&m_target);
    for (int i = 0; i < 128; i++) {
        m_target.limbs[i / 4] |= ((uint32_t)msg[i]) << ((i % 4) * 8);
    }
    
    for (int i = 0; i < 32; i++) {
        if (m_ver.limbs[i] != m_target.limbs[i]) return 0;
    }
    return 1;
}
