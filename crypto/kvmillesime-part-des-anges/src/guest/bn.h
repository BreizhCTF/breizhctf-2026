#ifndef BN_H
#define BN_H

#include "types.h"

/**
 * @brief BigNum configuration.
 * BN_MAX_LIMBS is set to 64 to support intermediate 2048-bit products for RSA-1024.
 */
#define BN_MAX_LIMBS 64

/**
 * @struct bn_t
 * @brief Fixed-size BigNum structure representing a little-endian limb array.
 */
typedef struct {
    uint32_t limbs[BN_MAX_LIMBS];
} bn_t;

/**
 * @brief Zeroes out all limbs of a BigNum.
 * @param a Pointer to the BigNum to clear.
 */
void bn_clear(bn_t *a);

/**
 * @brief Copies the content of one BigNum to another.
 * @param dst Destination BigNum pointer.
 * @param src Source BigNum pointer.
 */
void bn_copy(bn_t *dst, const bn_t *src);

/**
 * @brief Compares two BigNums of length n.
 * @param a First BigNum.
 * @param b Second BigNum.
 * @param n Number of limbs to compare.
 * @return 1 if a > b, -1 if a < b, 0 if equal.
 */
int bn_cmp(const bn_t *a, const bn_t *b, int n);

/**
 * @brief Performs subtraction: r = a - b.
 * @param r Result BigNum.
 * @param a Minuend.
 * @param b Subtrahend.
 * @param n Number of limbs to subtract.
 */
void bn_sub(bn_t *r, const bn_t *a, const bn_t *b, int n);

/**
 * @brief Performs addition: r = a + b.
 * @param r Result BigNum.
 * @param a First addend array.
 * @param b Second addend array.
 * @param n Number of limbs to add.
 */
void bn_add(bn_t *r, const uint32_t *a, const uint32_t *b, int n);

/**
 * @brief Performs long multiplication of two BigNums.
 * @param r Result BigNum (must be large enough to hold an*bn limbs).
 * @param a First factor.
 * @param an Number of limbs in a.
 * @param b Second factor.
 * @param bn Number of limbs in b.
 */
void bn_mul(bn_t *r, const bn_t *a, int an, const bn_t *b, int bn);

/**
 * @brief Performs in-place modular reduction: a = a % m.
 * @param a The BigNum to reduce.
 * @param an Current number of limbs in a.
 * @param m The modulus.
 * @param mn Number of limbs in m.
 */
void bn_mod(bn_t *a, int an, const bn_t *m, int mn);

/**
 * @brief Performs modular multiplication: r = (a * b) % m.
 * @param r Result BigNum.
 * @param a First factor.
 * @param b Second factor.
 * @param m Modulus.
 * @param n Number of limbs in factors and modulus.
 */
void mod_mul(bn_t *r, const bn_t *a, const bn_t *b, const bn_t *m, int n);

/**
 * @brief Performs modular exponentiation: r = (base ^ exp) % m.
 * @param r Result BigNum.
 * @param base Base BigNum.
 * @param exp Exponent BigNum.
 * @param m Modulus.
 * @param n Number of limbs.
 */
void mod_exp(bn_t *r, const bn_t *base, const bn_t *exp, const bn_t *m, int n);

#endif
