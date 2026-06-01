#include "user_interface.h"
#include <stdio.h>
#include <string.h>

const char *bs_artifact_tag =
    "Breizh Systems // artifact emulated-trust // build E7";

__attribute__((noinline)) void bs_banner() {
  puts("Breizh Systems :: artifact emulated-trust");
}

__attribute__((noinline)) void bs_prompt() {
  printf("Breizh Systems :: enter token: ");
  fflush(stdout);
}

__attribute__((noinline)) void bs_ok() { puts("Breizh Systems :: status: ok"); }

__attribute__((noinline)) void bs_denied() {
  puts("Breizh Systems :: status: denied");
}

__attribute__((noinline)) void bs_strip_newline(char *string) {
  if (string) {
    string[strcspn(string, "\n")] = '\0';
  }
}
