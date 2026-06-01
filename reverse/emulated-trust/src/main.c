#include "decode.h"
#include "protections.h"
#include "user_interface.h"
#include "validate.h"
#include <stdio.h>

#define INPUT_BUFFER_LENGTH (FLAG_LENGTH + 2)

typedef char input_buffer[INPUT_BUFFER_LENGTH];

int main() {
  input_buffer buffer = {0};

  bs_initialize_environment();

  bs_banner();
  bs_prompt();

  if (!fgets(buffer, sizeof(buffer), stdin)) {
    bs_denied();

    return 1;
  }

  bs_strip_newline(buffer);

  if (bs_validate_input(buffer)) {
    bs_ok();

    return 0;
  }

  bs_denied();

  return 1;
}
