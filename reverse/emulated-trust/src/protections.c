#include "protections.h"
#include "user_interface.h"
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ptrace.h>
#include <unistd.h>

static bool has_debugger() {
  FILE *file = fopen("/proc/self/status", "r");

  if (!file) {
    return false;
  }

  char line[256];

  while (fgets(line, sizeof(line), file)) {
    if (strncmp(line, "TracerPid:", 10) == 0) {
      int process_identifier = atoi(line + 10);

      fclose(file);

      return process_identifier != 0;
    }
  }

  fclose(file);

  return false;
}

static bool has_ptrace() { return ptrace(PTRACE_TRACEME, 0, 1, 0) == -1; }

static bool has_ld_preload() {
  const char *preload = getenv("LD_PRELOAD");

  return preload && *preload;
}

__attribute__((noinline)) void bs_initialize_environment() {
  if (has_debugger() || has_ptrace() || has_ld_preload()) {
    bs_denied();

    _exit(1);
  }
}
