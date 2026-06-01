#include "hash.h"
#include <stddef.h>
#include <stdint.h>

static uint64_t fnv1a_hash(const uint8_t *data, size_t length) {
  uint64_t hash = 0xcbf29ce484222325ULL;

  for (size_t index = 0; index < length; index++) {
    hash ^= data[index];
    hash *= 0x100000001b3ULL;
  }

  return hash;
}

__attribute__((noinline)) uint64_t bs_hash_memory(const void *function,
                                                  size_t size) {
  return fnv1a_hash((const uint8_t *)function, size);
}
