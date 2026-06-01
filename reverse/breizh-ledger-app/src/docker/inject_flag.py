#!/usr/bin/env python3
import argparse
import hashlib
import hmac
import time

import requests
from Crypto.Cipher import AES

INJECT_HMAC_KEY = bytes(
    [
        0x4B,
        0x72,
        0x65,
        0x69,
        0x7A,
        0x68,
        0x5F,
        0x48,
        0x4D,
        0x41,
        0x43,
        0x5F,
        0x4B,
        0x33,
        0x59,
        0x21,
        0x42,
        0x5A,
        0x48,
        0x43,
        0x54,
        0x46,
        0x32,
        0x30,
        0x32,
        0x35,
        0x4C,
        0x65,
        0x64,
        0x67,
        0x65,
        0x72,
    ]
)

INJECT_IV = bytes(
    [
        0xDE,
        0xAD,
        0xBE,
        0xEF,
        0xCA,
        0xFE,
        0xBA,
        0xBE,
        0x13,
        0x37,
        0x42,
        0x69,
        0xB2,
        0x48,
        0x21,
        0x21,
    ]
)

FLAG_SIZE = 32


def build_set_flag_apdu(flag: str) -> str:
    flag_bytes = flag.encode("ascii")
    if len(flag_bytes) > FLAG_SIZE:
        raise ValueError(f"Flag too long ({len(flag_bytes)}), max {FLAG_SIZE}")

    plaintext = flag_bytes + (b"\x00" * (FLAG_SIZE - len(flag_bytes)))
    cipher = AES.new(INJECT_HMAC_KEY, AES.MODE_CBC, INJECT_IV)
    ciphertext = cipher.encrypt(plaintext)
    mac = hmac.new(INJECT_HMAC_KEY, ciphertext, hashlib.sha256).digest()
    payload = mac + ciphertext
    apdu = bytes([0xE0, 0xFF, 0x00, 0x00, len(payload)]) + payload
    return apdu.hex()


def wait_api(url: str, timeout_s: float = 20.0):
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            requests.get(url, timeout=0.8)
            return
        except requests.RequestException:
            time.sleep(0.2)
    raise RuntimeError(f"Speculos API not reachable at {url}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:5000")
    parser.add_argument("--flag", required=True)
    args = parser.parse_args()

    wait_api(args.url)
    apdu_hex = build_set_flag_apdu(args.flag)
    resp = requests.post(f"{args.url}/apdu", json={"data": apdu_hex}, timeout=5.0)
    resp.raise_for_status()
    sw = resp.json().get("data", "")
    if not sw.endswith("9000"):
        raise RuntimeError(f"SET_FLAG failed: {sw}")

    print("[+] Flag injected into Speculos")


if __name__ == "__main__":
    main()
