import hashlib
import json

from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad


def decrypt():
    with open("attack_data.json", "r") as f:
        data = json.load(f)
        enc_flag_hex = data["enc_flag"]

    with open("key.json", "r") as f:
        s_vec = json.load(f)

    s_string = "".join(str(x) for x in s_vec)
    aes_key = hashlib.sha256(s_string.encode()).digest()

    cipher = AES.new(aes_key, AES.MODE_ECB)
    flag = unpad(cipher.decrypt(bytes.fromhex(enc_flag_hex)), 16)
    print(f"FLAG: {flag.decode()}")


if __name__ == "__main__":
    decrypt()
