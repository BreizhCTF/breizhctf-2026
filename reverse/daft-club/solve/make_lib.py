#!/usr/bin/env python3
import os
import sys
import lief

VALIDATOR_PATH     = os.path.join(os.path.dirname(__file__), "../files/DaftClub/validator")
LIB_PATH           = os.path.join(os.path.dirname(__file__), "wb_encrypt.so")
WB_AES_ENCRYPT_RVA = 0x40c0   # largest function in .text (37 042 bytes), confirmed via LIEF


def build_lib(force=False):
    if os.path.exists(LIB_PATH) and not force:
        return LIB_PATH

    binary = lief.parse(VALIDATOR_PATH)
    binary.add_exported_function(WB_AES_ENCRYPT_RVA, "wb_aes_encrypt")

    # glibc >= 2.29 refuses dlopen() on binaries with DF_1_PIE set
    flags1 = binary[lief.ELF.DynamicEntry.TAG.FLAGS_1]
    if flags1 is not None:
        flags1.remove(lief.ELF.DynamicEntryFlags.FLAG.PIE)

    binary.write(LIB_PATH)
    print(f"[make_lib] written {LIB_PATH}")
    return LIB_PATH


if __name__ == "__main__":
    force = "--force" in sys.argv
    build_lib(force=force)
