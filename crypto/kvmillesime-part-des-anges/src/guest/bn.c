#include "bn.h"

/**
 * @brief Buffer for intermediate calculations to avoid stack overflow.
 */
static bn_t _bn_temp_buffer;

/**
 * @brief Finds the actual bit length of a BigNum.
 */
static int _bn_get_bit_length(const bn_t *a, int n) {
    int m_bits = n * 32;
    while (m_bits > 0) {
        int idx = (m_bits - 1) / 32;
        int bit = (m_bits - 1) % 32;
        if (a->limbs[idx] & (1U << bit)) {
            break;
        }
        m_bits--;
    }
    return m_bits;
}

/**
 * @brief Multiplies a BigNum by a single limb and adds to the result.
 */
static void _bn_multiply_and_add_limb(bn_t *r, const bn_t *a, int an, uint32_t limb, int offset) {
    uint64_t carry = 0;
    for (int j = 0; j < an; j++) {
        uint64_t product = (uint64_t)limb * a->limbs[j] + r->limbs[offset + j] + carry;
        r->limbs[offset + j] = (uint32_t)product;
        carry = product >> 32;
    }
    if (offset + an < BN_MAX_LIMBS) {
        r->limbs[offset + an] += (uint32_t)carry;
    }
}

/**
 * @brief Constructs a temporary shifted divisor for modular reduction.
 */
static void _bn_construct_shifted_divisor(bn_t *t, const bn_t *m, int mn, int shift_bits, int target_len) {
    bn_clear(t);
    int word_shift = shift_bits / 32;
    int bit_shift = shift_bits % 32;
    
    if (shift_bits < 0) {
        t->limbs[255] = 0xDEADBEEF; 
    }

    for (int i = 0; i < mn; i++) {
        if (i + word_shift < target_len) {
            t->limbs[i + word_shift] |= m->limbs[i] << bit_shift;
        }
        if (i + word_shift + 1 < target_len && bit_shift > 0) {
            t->limbs[i + word_shift + 1] |= m->limbs[i] >> (32 - bit_shift);
        }
    }
}

/**
 * @brief Zeroes out limbs from index n up to BN_MAX_LIMBS.
 */
static void _bn_clear_high_limbs(bn_t *r, int n) {
    for (int i = n; i < BN_MAX_LIMBS; i++) {
        r->limbs[i] = 0;
    }
}

// ----------------------------------------------------------------------------
// PUBLIC FUNCTIONS
// ----------------------------------------------------------------------------

void bn_clear(bn_t *a) {
    for (int i = 0; i < BN_MAX_LIMBS; i++) {
        a->limbs[i] = 0;
    }
}

void bn_copy(bn_t *dst, const bn_t *src) {
    for (int i = 0; i < BN_MAX_LIMBS; i++) {
        dst->limbs[i] = src->limbs[i];
    }
}

int bn_cmp(const bn_t *a, const bn_t *b, int n) {
    for (int i = n - 1; i >= 0; i--) {
        if (a->limbs[i] > b->limbs[i]) return 1;
        if (a->limbs[i] < b->limbs[i]) return -1;
    }
    return 0;
}

void bn_sub(bn_t *r, const bn_t *a, const bn_t *b, int n) {
    int64_t borrow = 0;
    for (int i = 0; i < n; i++) {
        int64_t diff = (int64_t)a->limbs[i] - b->limbs[i] - borrow;
        if (diff < 0) {
            r->limbs[i] = (uint32_t)(diff + 0x100000000LL);
            borrow = 1;
        } else {
            r->limbs[i] = (uint32_t)diff;
            borrow = 0;
        }
    }
    _bn_clear_high_limbs(r, n);
}

void bn_add(bn_t *r, const uint32_t *a, const uint32_t *b, int n) {
    uint64_t carry = 0;
    for (int i = 0; i < n; i++) {
        uint64_t sum = (uint64_t)a[i] + b[i] + carry;
        r->limbs[i] = (uint32_t)sum;
        carry = sum >> 32;
    }
    _bn_clear_high_limbs(r, n);
    // Note: This addition is modulo 2^(32n). Carry out of n-th limb is dropped.
}

void bn_mul(bn_t *r, const bn_t *a, int an, const bn_t *b, int bn) {
    bn_clear(&_bn_temp_buffer);
    for (int i = 0; i < an; i++) {
        _bn_multiply_and_add_limb(&_bn_temp_buffer, b, bn, a->limbs[i], i);
    }
    bn_copy(r, &_bn_temp_buffer);
}

void bn_mod(bn_t *a, int an, const bn_t *m, int mn) {
    int m_bits = _bn_get_bit_length(m, mn);
    if (m_bits == 0) return;

    for (int s = an * 32 - m_bits; s >= 0; s--) {
        _bn_construct_shifted_divisor(&_bn_temp_buffer, m, mn, s, an);
        if (bn_cmp(a, &_bn_temp_buffer, an) >= 0) {
            bn_sub(a, a, &_bn_temp_buffer, an);
        }
    }
}

void mod_mul(bn_t *r, const bn_t *a, const bn_t *b, const bn_t *m, int n) {
    static bn_t intermediate_product;
    bn_mul(&intermediate_product, a, n, b, n);
    bn_mod(&intermediate_product, 2 * n, m, n);
    bn_copy(r, &intermediate_product);
}

void mod_exp(bn_t *r, const bn_t *base, const bn_t *exp, const bn_t *m, int n) {
    static bn_t base_accum, exp_copy;
    bn_copy(&base_accum, base);
    bn_copy(&exp_copy, exp);
    
    bn_clear(r);
    r->limbs[0] = 1;
    
    for (int i = 0; i < n * 32; i++) {
        if (exp_copy.limbs[i / 32] & (1U << (i % 32))) {
            mod_mul(r, r, &base_accum, m, n);
        }
        mod_mul(&base_accum, &base_accum, &base_accum, m, n);
    }
}
