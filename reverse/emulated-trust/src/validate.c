#include "validate.h"
#include "decode.h"
#include "hash.h"
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#define FUNCTION_HASH_SIZE 256
#define BS_INDEX_MASK 0x6c8e9cf1U
#define BS_HASH_MASK 0x4f2a7c91d6b8e305ULL

static void bs_prepare_decode_context(bs_decode_context *context, int index,
                                      uint64_t hash) {
  uint32_t encoded_index = (uint32_t)index ^ BS_INDEX_MASK;
  uint64_t encoded_hash = hash ^ BS_HASH_MASK;

  context->blob[0] = 0x17;
  context->blob[1] = 0x29;
  context->blob[2] = (uint8_t)encoded_hash;
  context->blob[3] = (uint8_t)encoded_index;
  context->blob[4] = 0x4d;
  context->blob[5] = (uint8_t)(encoded_hash >> 8);
  context->blob[6] = 0x63;
  context->blob[7] = (uint8_t)(encoded_index >> 8);
  context->blob[8] = (uint8_t)(encoded_hash >> 16);
  context->blob[9] = (uint8_t)(encoded_hash >> 24);
  context->blob[10] = (uint8_t)(encoded_hash >> 32);
  context->blob[11] = (uint8_t)(encoded_index >> 16);
  context->blob[12] = (uint8_t)(encoded_hash >> 40);
  context->blob[13] = (uint8_t)(encoded_hash >> 48);
  context->blob[14] = (uint8_t)(encoded_hash >> 56);
  context->blob[15] = (uint8_t)(encoded_index >> 24);
}

__attribute__((noinline)) int bs_validate_input(const char *input) {
  if (!input || strlen(input) != FLAG_LENGTH) {
    return 0;
  }

  bs_decode_context context;

  uint64_t hash =
      bs_hash_memory((const void *)bs_validate_input, FUNCTION_HASH_SIZE) ^
      bs_hash_memory((const void *)bs_decode_character, FUNCTION_HASH_SIZE);

  for (size_t index = 0; index < FLAG_LENGTH; index++) {
    bs_prepare_decode_context(&context, (int)index, hash);

    if (input[index] != bs_decode_character(&context)) {
      return 0;
    }
  }

  return 1;
}
