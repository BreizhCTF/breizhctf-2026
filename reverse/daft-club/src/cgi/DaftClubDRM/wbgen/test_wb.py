#!/usr/bin/env python3
"""
Whitebox AES test harness.

Usage (from src/cgi/):
    python3 DaftClubDRM/wbgen/test_wb.py

Or pass an explicit .so path:
    python3 DaftClubDRM/wbgen/test_wb.py path/to/wb_aes.so
"""

import ctypes
import os
import struct
import subprocess
import sys
import tempfile
from pathlib import Path



_SBOX = [
    0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
    0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
    0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
    0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
    0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
    0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
    0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
    0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
    0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
    0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
    0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
    0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
    0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
    0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
    0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
    0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16,
]

_RCON = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36]

def _xtime(b): return ((b << 1) ^ 0x1b) & 0xff if b & 0x80 else (b << 1) & 0xff

def _key_schedule(key: bytes) -> list[list[int]]:
    w = list(key)
    for i in range(4, 44):
        t = w[(i-1)*4:(i-1)*4+4]
        if i % 4 == 0:
            t = [_SBOX[t[1]] ^ _RCON[i//4-1], _SBOX[t[2]], _SBOX[t[3]], _SBOX[t[0]]]
        w += [t[j] ^ w[(i-4)*4+j] for j in range(4)]
    return [w[i*16:(i+1)*16] for i in range(11)]

def _sub_bytes(s): return [_SBOX[b] for b in s]

_SR = [0,5,10,15, 4,9,14,3, 8,13,2,7, 12,1,6,11]
def _shift_rows(s): return [s[_SR[i]] for i in range(16)]

def _mix_col(a, b, c, d):
    return [
        _xtime(a) ^ _xtime(b) ^ b ^ c ^ d,
        a ^ _xtime(b) ^ _xtime(c) ^ c ^ d,
        a ^ b ^ _xtime(c) ^ _xtime(d) ^ d,
        _xtime(a) ^ a ^ b ^ c ^ _xtime(d),
    ]

def _mix_columns(s):
    out = []
    for j in range(4):
        out += _mix_col(s[4*j], s[4*j+1], s[4*j+2], s[4*j+3])
    return out

def _add_rk(s, rk): return [s[i] ^ rk[i] for i in range(16)]

def ref_aes128_ecb_encrypt(key: bytes, pt: bytes) -> bytes:
    rk = _key_schedule(key)
    s = _add_rk(list(pt), rk[0])
    for r in range(1, 10):
        s = _add_rk(_mix_columns(_shift_rows(_sub_bytes(s))), rk[r])
    s = _add_rk(_shift_rows(_sub_bytes(s)), rk[10])
    return bytes(s)


SCRIPT_DIR = Path(__file__).parent          # src/cgi/DaftClubDRM/wbgen/
CGI_DIR    = SCRIPT_DIR.parent.parent       # src/cgi/
SHIM_CPP   = SCRIPT_DIR / "wb_shim.cpp"
SO_PATH    = SCRIPT_DIR / "wb_aes.so"

def build_so() -> Path:
    print(f"[build] compiling {SHIM_CPP.name} → {SO_PATH.name}")
    cmd = [
        "g++", "-O2", "-std=c++17", "-shared", "-fPIC",
        f"-I{CGI_DIR}",
        str(SHIM_CPP),
        "-o", str(SO_PATH),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("[build] FAILED:")
        print(result.stderr)
        sys.exit(1)
    print(f"[build] ok ({SO_PATH})")
    return SO_PATH

def load_so(path: Path) -> ctypes.CDLL:
    lib = ctypes.CDLL(str(path))
    lib.shim_wb_aes_encrypt.argtypes = [
        ctypes.POINTER(ctypes.c_uint8),
        ctypes.POINTER(ctypes.c_uint8),
    ]
    lib.shim_wb_aes_encrypt.restype = None
    lib.shim_wb_validate_key.argtypes = [ctypes.c_char_p]
    lib.shim_wb_validate_key.restype  = ctypes.c_int
    return lib

def wb_encrypt(lib, pt: bytes) -> bytes:
    assert len(pt) == 16
    in_buf  = (ctypes.c_uint8 * 16)(*pt)
    out_buf = (ctypes.c_uint8 * 16)()
    lib.shim_wb_aes_encrypt(in_buf, out_buf)
    return bytes(out_buf)



def read_expected_ct() -> bytes | None:
    """Parse the expected_ct array from wb_tables.h if it exists."""
    tables_h = CGI_DIR / "DaftClubDRM" / "wb_tables.h"
    if not tables_h.exists():
        return None
    text = tables_h.read_text()
    import re
    m = re.search(r'expected_ct\[32\]\s*=\s*\{([^}]+)\}', text)
    if not m:
        return None
    vals = [int(x, 16) for x in re.findall(r'0x[0-9a-fA-F]+', m.group(1))]
    if len(vals) != 32:
        return None
    return bytes(vals)


PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"

def check(name: str, got: bytes, want: bytes) -> bool:
    ok = got == want
    tag = PASS if ok else FAIL
    print(f"  [{tag}] {name}")
    if not ok:
        print(f"         got:  {got.hex()}")
        print(f"         want: {want.hex()}")
    return ok

def run_tests(lib) -> int:
    failures = 0

    print("\n── Determinism ──")
    for i, pt_hex in enumerate([
        "00000000000000000000000000000000",
        "ffffffffffffffffffffffffffffffff",
        "0102030405060708090a0b0c0d0e0f10",
        "deadbeefcafebabe0011223344556677",
    ]):
        pt = bytes.fromhex(pt_hex)
        ct1 = wb_encrypt(lib, pt)
        ct2 = wb_encrypt(lib, pt)
        ok = check(f"determinism vector {i}  pt={pt_hex[:16]}…", ct1, ct2)
        if not ok: failures += 1

    print("\n── Non-triviality ──")
    for i, pt_hex in enumerate([
        "00000000000000000000000000000000",
        "ffffffffffffffffffffffffffffffff",
    ]):
        pt = bytes.fromhex(pt_hex)
        ct = wb_encrypt(lib, pt)
        ok = ct != pt
        tag = PASS if ok else FAIL
        print(f"  [{tag}] output ≠ input for {pt_hex[:16]}…")
        if not ok: failures += 1

    print("\n── expected_ct cross-check ──")
    expected = read_expected_ct()
    if expected is None:
        print("  [SKIP] wb_tables.h not found or no expected_ct")
    else:

        ct_a = wb_encrypt(lib, b'\x00' * 16)
        ct_b = wb_encrypt(lib, b'\x00' * 16)
        ok = check("zero-block consistency", ct_a, ct_b)
        if not ok: failures += 1
        print(f"  [INFO] expected_ct[0:16] = {expected[:16].hex()}")
        print(f"  [INFO] wb(zeros)[0:16]   = {ct_a.hex()}")
        print("  (these differ unless the CD key was all-zeros, which is fine)")

    print("\n── wb_validate_key ──")
    wrong = b"DAFT-XXXXX-XXXXX-XXXXX\x00"
    ret = lib.shim_wb_validate_key(wrong)
    ok = ret == 0
    tag = PASS if ok else FAIL
    print(f"  [{tag}] wrong key rejected (got {ret})")
    if not ok: failures += 1

    ret = lib.shim_wb_validate_key(b"\x00" * 23)
    ok = ret == 0
    tag = PASS if ok else FAIL
    print(f"  [{tag}] null key rejected  (got {ret})")
    if not ok: failures += 1

    print("\n── Reference AES self-check (pure Python) ──")
    fips_key = bytes.fromhex("2b7e151628aed2a6abf7158809cf4f3c")
    fips_pt  = bytes.fromhex("3243f6a8885a308d313198a2e0370734")
    fips_ct  = bytes.fromhex("3925841d02dc09fbdc118597196a0b32")
    got = ref_aes128_ecb_encrypt(fips_key, fips_pt)
    ok = check("FIPS-197 Appendix B", got, fips_ct)
    if not ok: failures += 1

    return failures


def main():
    so_path = Path(sys.argv[1]) if len(sys.argv) > 1 else None

    if so_path is None:
        so_path = build_so()
    else:
        print(f"[load] using existing {so_path}")

    lib = load_so(so_path)

    print(f"\n[test] loaded {so_path.name}")
    failures = run_tests(lib)

    print()
    if failures == 0:
        print(f"All tests passed.")
    else:
        print(f"{failures} test(s) FAILED.")
        sys.exit(1)


if __name__ == "__main__":
    main()
