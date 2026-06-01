#!/usr/bin/env python3
import hashlib
import json
import os
import random
import time

from Crypto.Cipher import AES
from Crypto.Util.Padding import pad

N = 96
Q = 3329

FLAG: str = os.getenv("FLAG", "BZHCTF{FAKE_FLAG}")


class LGCM_PRNG:
    def __init__(self, seed):
        self.state = seed
        self.a = 16645258
        self.c = 1013904223
        self.m = 2**32

    def next_noise(self):
        self.state = (self.a * self.state + self.c) % self.m
        high_bits = self.state >> 31
        val = (high_bits * Q // 4) + Q // 10
        return val % Q


PRNG = LGCM_PRNG(time.time_ns())


def to_bits(text):
    bits = []
    for char in text:
        binval = bin(ord(char))[2:].zfill(8)
        bits.extend([int(b) for b in binval])
    return bits


class HSMService:
    def __init__(self):
        self.clef_privee = [random.randint(0, 1) for _ in range(N)]

    def _get_noise(self):
        return PRNG.next_noise()

    def encrypt_bit(self, bit_val):
        A = [random.randint(0, Q - 1) for _ in range(N)]
        A_dot_s = sum(a * s for a, s in zip(A, self.clef_privee))
        noise = self._get_noise()
        b = (A_dot_s + noise + bit_val * (Q // 2)) % Q

        return A, b

    def decrypt_bit(self, A, b):
        A_dot_s = sum(a * s for a, s in zip(A, self.clef_privee))
        approx_val = (b - A_dot_s) % Q

        return Q // 4 < approx_val < 3 * Q // 4

    def _cipher_db(self, key):
        s_string = "".join(str(x) for x in key)
        aes_key = hashlib.sha256(s_string.encode()).digest()

        cipher = AES.new(aes_key, AES.MODE_ECB)
        encrypted_flag = cipher.encrypt(pad(FLAG.encode(), 16))

        return encrypted_flag.hex()

    def export_db(self):
        return self._cipher_db(self.clef_privee)


if __name__ == "__main__":
    service = HSMService()

    print("HSM Shell")
    while True:
        choice = input("> ")

        if choice == "cipher":
            user_input = int(input("bit ? "))
            if user_input not in [0, 1]:
                print("ERR. Can only cipher bits")
                continue

            A, b = service.encrypt_bit(user_input)
            print(json.dumps({"public_key": A, "ciphertext": b}))

        elif choice == "decipher":
            user_input = input('(A, b) au format JSON {"A": ..., "b": ...} : ')
            user_json = json.loads(user_input)
            print(service.decrypt_bit(user_json["A"], user_json["b"]))

        elif choice == "exportDB":
            print(service.export_db())

        elif choice == "upgrade":
            print("Sera supporté dans une prochaine version")
            break
