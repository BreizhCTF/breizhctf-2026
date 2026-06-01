#!/usr/bin/env python3
"""
Solve - Breizh CTF Ledger (state machine, 6 APDUs via Speculos REST API)
"""

import argparse

import requests

# INIT: P1=0x42 P2=0x5A
apdu_init = bytes([0xE0, 0x10, 0x42, 0x5A, 0x00])

# KEY: XOR(expected, key) => "Cr3p3sBZ"
xor_key = [0x42, 0x52, 0x45, 0x49, 0x5A, 0x48, 0x21, 0x21]
xor_exp = [0x01, 0x20, 0x76, 0x39, 0x69, 0x3B, 0x63, 0x7B]
apdu_key = bytes([0xE0, 0x11, 0x01, 0x00, 0x08]) + bytes(
    e ^ k for e, k in zip(xor_exp, xor_key)
)

# CONFIG: P1*P2 == 0x15 => 3*7
apdu_config = bytes([0xE0, 0x12, 0x03, 0x07, 0x00])

# VERIFY: invert nibble sbox
sbox = [
    0x0E,
    0x04,
    0x0D,
    0x01,
    0x02,
    0x0F,
    0x0B,
    0x08,
    0x03,
    0x0A,
    0x06,
    0x0C,
    0x05,
    0x09,
    0x00,
    0x07,
]
inv = [0] * 16
for i in range(16):
    inv[sbox[i]] = i
verify = []
for b in [0xB4, 0xE1, 0x7C, 0x2D]:
    verify.append((inv[b >> 4] << 4) | inv[b & 0xF])
apdu_verify = bytes([0xE0, 0x13, 0x00, 0x00, 0x04]) + bytes(verify)

# ARM: (P1<<8|P2) == 0x1337
apdu_arm = bytes([0xE0, 0x14, 0x13, 0x37, 0x00])

# FLAG
apdu_flag = bytes([0xE0, 0x20, 0x00, 0x00, 0x00])

SEQUENCE = [apdu_init, apdu_key, apdu_config, apdu_verify, apdu_arm, apdu_flag]


def main():
    p = argparse.ArgumentParser()
    p.add_argument(
        "--url",
        default="http://localhost:5000",
        help="Speculos API base URL (default: http://localhost:5000)",
    )
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    for apdu in SEQUENCE:
        h = apdu.hex()
        if args.dry_run:
            print(h)
            continue

        r = requests.post(f"{args.url}/apdu", json={"data": h})
        r.raise_for_status()
        sw = r.json().get("data", "")
        print(f"{h} => {sw}")
        if not sw.endswith("9000"):
            print(f"fail: {sw}")
            return

    if not args.dry_run:
        print("done, check speculos screen")


if __name__ == "__main__":
    main()
