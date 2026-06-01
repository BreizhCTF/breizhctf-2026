#include "decode.h"
#include <stdint.h>

__attribute__((used, section(".bs_flag"))) static volatile const uint8_t
    encoded_flag[FLAG_LENGTH] = {0xdc, 0x15, 0xef, 0x10, 0x7d, 0x52, 0xf1, 0x70,
                                 0xae, 0x22, 0x94, 0x64, 0x18, 0x79, 0xb9, 0x70,
                                 0xc1, 0x7c, 0xca, 0x26, 0x18, 0x20, 0xbd, 0x74,
                                 0xae, 0x21, 0xf8, 0x62, 0x1c, 0x4b, 0xb9, 0x71,
                                 0xab, 0x7e, 0x94, 0x21, 0x54};

#define BS_INDEX_MASK 0x6c8e9cf1U
#define BS_HASH_MASK 0x4f2a7c91d6b8e305ULL

__attribute__((noinline)) char
bs_decode_character(const bs_decode_context *context) {
  const uint8_t *blob = context->blob;
  uint32_t index = ((uint32_t)blob[3]) | ((uint32_t)blob[7] << 8) |
                   ((uint32_t)blob[11] << 16) | ((uint32_t)blob[15] << 24);
  uint64_t hash = ((uint64_t)blob[2]) | ((uint64_t)blob[5] << 8) |
                  ((uint64_t)blob[8] << 16) | ((uint64_t)blob[9] << 24) |
                  ((uint64_t)blob[10] << 32) | ((uint64_t)blob[12] << 40) |
                  ((uint64_t)blob[13] << 48) | ((uint64_t)blob[14] << 56);

  index ^= BS_INDEX_MASK;
  hash ^= BS_HASH_MASK;

  uint8_t decoded = encoded_flag[index];
  uint8_t key = (uint8_t)((hash >> (index % 8)) & 0xFF);

  decoded ^= key;

  return (char)decoded;
}
