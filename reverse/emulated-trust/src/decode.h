#ifndef DECODE_H
#define DECODE_H

#include <stdint.h>

#define FLAG_LENGTH 37

typedef struct {
  uint8_t blob[16];
} bs_decode_context;

char bs_decode_character(const bs_decode_context *context);

#endif
