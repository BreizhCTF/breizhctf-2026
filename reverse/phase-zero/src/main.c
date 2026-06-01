#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define FLAG_LENGTH 18
#define FAKE_KEY_LENGTH 6
#define FAKE_LENGTH 29

#define FLAG_BUFFER_LENGTH (FLAG_LENGTH + 1)
#define FAKE_BUFFER_LENGTH (FAKE_LENGTH + 1)
#define INPUT_BUFFER_LENGTH (FLAG_LENGTH + 2)
#define FAKE_INPUT_BUFFER_LENGTH (FAKE_LENGTH + 2)

typedef unsigned char flag_buffer[FLAG_BUFFER_LENGTH];
typedef unsigned char fake_buffer[FAKE_BUFFER_LENGTH];
typedef char input_buffer[INPUT_BUFFER_LENGTH];
typedef char fake_input_buffer[FAKE_INPUT_BUFFER_LENGTH];

const char *bs_artifact_tag =
    "Breizh Systems // artifact phase-zero // build A17";

__attribute__((always_inline)) void bs_banner() {
  puts("Breizh Systems :: artifact phase-zero");
}

__attribute__((always_inline)) void bs_prompt() {
  printf("Breizh Systems :: enter token: ");
  fflush(stdout);
}
__attribute__((always_inline)) void bs_ok() {
  puts("Breizh Systems :: status: ok");
}
__attribute__((always_inline)) void bs_denied() {
  puts("Breizh Systems :: status: denied");
}
__attribute__((always_inline)) void bs_strip_newline(char *string) {
  if (string) {
    string[strcspn(string, "\n")] = '\0';
  }
}

void decode_real_flag(flag_buffer output) {
  static const unsigned char encoded[] = {
      0x66, 0x6f, 0x62, 0x67, 0x7d, 0x6c, 0x4f, 0x1a, 0x44,
      0x19, 0x1c, 0x75, 0x1c, 0x57, 0x58, 0x1c, 0x52, 0x57,
  };
  static const unsigned char offsets[] = {2, 1, 0};

  for (size_t index = 0; index < FLAG_LENGTH; index++) {
    output[index] = encoded[index] + offsets[index % 3];
  }

  memfrob(output, FLAG_LENGTH);
}

int check_real_token(const char *input) {
  if (!input || strlen(input) != FLAG_LENGTH) {
    return 0;
  }

  flag_buffer expected = {0};
  decode_real_flag(expected);

  return memcmp(input, expected, FLAG_LENGTH) == 0;
}

__attribute__((constructor)) void real_entry_point() {
  bs_banner();
  bs_prompt();

  input_buffer user_input = {0};

  if (!fgets(user_input, sizeof(user_input), stdin)) {
    bs_denied();

    exit(1);
  }

  bs_strip_newline(user_input);

  if (check_real_token(user_input)) {
    bs_ok();

    exit(0);
  }

  bs_denied();

  exit(1);
}

__attribute__((noinline)) void bs_xor_decode(fake_buffer output,
                                             const unsigned char *data) {
  static const unsigned char xor_key[] = {0x42, 0x5a, 0x48, 0x43, 0x54, 0x46};

  for (size_t index = 0; index < FAKE_LENGTH; index++) {
    output[index] = data[index] ^ xor_key[index % FAKE_KEY_LENGTH];
  }
}

__attribute__((noinline)) int bs_guard(const char *input) {
  if (!input || strlen(input) != FAKE_LENGTH) {
    return 0;
  }

  static const unsigned char encoded[] = {
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x39, 0x6b, 0x7d, 0x1c,
      0x63, 0x2e, 0x73, 0x6f, 0x17, 0x74, 0x3c, 0x75, 0x1d, 0x28,
      0x7b, 0x77, 0x65, 0x19, 0x2f, 0x6e, 0x79, 0x2d, 0x29,
  };

  fake_buffer fake = {0};
  bs_xor_decode(fake, encoded);

  return memcmp(input, fake, FAKE_LENGTH) == 0;
}

int main() {
  bs_banner();
  bs_prompt();

  fake_input_buffer buffer = {0};

  if (!fgets(buffer, sizeof(buffer), stdin)) {
    bs_denied();

    return 1;
  }

  bs_strip_newline(buffer);

  if (bs_guard(buffer)) {
    bs_ok();

    return 0;
  }

  bs_denied();

  return 1;
}
