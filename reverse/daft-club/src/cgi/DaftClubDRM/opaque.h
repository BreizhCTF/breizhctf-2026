#pragma once
#include <cstdint>


static inline uint64_t mba_zero_a(uint64_t x) {
    volatile uint64_t v = x;
    return (v | ~v) + 1ULL;
}


static inline uint64_t mba_zero_b(uint64_t x) {
    volatile uint64_t v = x;
    return v & ~v;
}


static inline uint64_t mba_zero_c(uint64_t x) {
    volatile uint64_t v = x;
    uint64_t a = v * (v + 1ULL);
    return (a & 1ULL) ^ (a & 1ULL);
}


static inline uint64_t mba_zero_d(uint64_t x) {
    volatile uint64_t v = x;
    uint64_t rot = (v << 17) | (v >> 47);
    uint64_t expr = v ^ rot;
    return expr ^ expr;
}


#define MBA_OPAQUE_A(x) (mba_zero_a((uint64_t)(uintptr_t)(x)) != 0)
#define MBA_OPAQUE_B(x) (mba_zero_b((uint64_t)(uintptr_t)(x)) != 0)
#define MBA_OPAQUE_C(x) (mba_zero_c((uint64_t)(uintptr_t)(x)) != 0)
#define MBA_OPAQUE_D(x) (mba_zero_d((uint64_t)(uintptr_t)(x)) != 0)
