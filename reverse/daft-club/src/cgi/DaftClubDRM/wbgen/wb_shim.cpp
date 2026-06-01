// Thin C shim that exposes wb_aes_encrypt / wb_validate_key as plain C symbols
// so the Python test harness can load them via ctypes.
//
// Build (from src/cgi/):
//   g++ -O2 -std=c++17 -shared -fPIC -I. \
//       DaftClubDRM/wbgen/wb_shim.cpp \
//       -o DaftClubDRM/wbgen/wb_aes.so

#include "DaftClubDRM/wb_aes.h"   // pulls in wb_tables.h

extern "C" {

void shim_wb_aes_encrypt(const uint8_t in[16], uint8_t out[16]) {
    wb_aes_encrypt(in, out);
}

int shim_wb_validate_key(const char* key_str) {
    return wb_validate_key(key_str) ? 1 : 0;
}

}
