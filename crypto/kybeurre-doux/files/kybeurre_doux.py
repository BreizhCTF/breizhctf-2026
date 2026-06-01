#!/usr/bin/env python3
"""Kybeurre-Doux challenge."""
import json
import os
import random
import sys
import time
from typing import List, Tuple

N = 64

FAKE_FLAG = r"BZHCTF{FAKE_FLAGFAKE_FLAGFAKE_FLAGFAKE_FLAGFAKE_FLAGFAKE_FLAGFA}"
FLAG = os.getenv("FLAG", FAKE_FLAG).encode()
assert len(FLAG) == N, "Flag mauvaise longueur"

Q = 3329
THRESHOLD = Q // 4


def add_noise(val: int) -> int:
    """Add noise to the value."""
    return (val + random.randint(-10, 10)) % Q


def encrypt(msg: bytes, secret_key: bytes) -> Tuple[List[List[int]], List[int]]:
    """Encrypt the message using the secret key."""
    bits_msg = "".join(format(c, "08b") for c in msg)

    aa = []
    bb = []
    for m in bits_msg:
        i = int(m)
        a = [random.randint(0, Q - 1) for _ in range(N)]
        a_dot_s = sum(x * y for x, y in zip(a, secret_key)) % Q
        b = add_noise(a_dot_s + i * (Q // 2))
        bb.append(b)
        aa.append(a)

    return aa, bb


def decrypt_one_bit(private_key: bytes, a: List[int], b: int) -> int:
    """Decrypt one bit using the private key."""
    if len(a) != N:
        print("Invalid dimensions")
        return 0

    mask = sum([x * y for x, y in zip(private_key, a)]) % Q
    msg_bruite = (b - mask) % Q
    msg_bruite = min(msg_bruite, Q - msg_bruite)

    return int(msg_bruite >= THRESHOLD)


def print_slow(text: str, delay: float = 0.01):
    """Print text slowly."""
    for char in text:
        sys.stdout.write(char)
        sys.stdout.flush()
        time.sleep(delay)
    print()


def main() -> None:
    """Main function to run the server."""
    encr = encrypt(random.randbytes(16), FLAG)
    print(
        r"""
   ___  ___  ___
  / _ )/ _ \/ _ \
 / _  / // / // /  Breizh Neural Dairies
/____/\__\_\____/  Hiring Portal v4.2.0-rc1
    """
    )

    intro = (
        "\n👋 Hello Game Changer.\n"
        "Je suis GPT-Erwann, le Talent Acquisition Manager virtuel de BQD.\n"
        "Mon algo de matching a détecté une anomalie positive dans votre profil.\n"
        "Êtes-vous prêt à onboarder l'excellence ?\n"
    )
    print_slow(intro)

    while True:
        menu = (
            "\n--- [ MENU DU CANDIDAT ] ---\n"
            "(1) 📥 Initialiser l'assessment\n"
            "(2) 🚀 Livrer la solution\n"
            "(3) ☕ Demander un café à l'IA \n"
            "(4) 🏃 Pivoter vers une autre carrière \n"
            "\nVotre choix > "
        )

        user_choice = input(menu).strip()

        if user_choice == "1":
            print("\n[GPT-Erwann] Initialisation du tunnel Kybeurre-Secure...")
            print(
                "[GPT-Erwann] Application du filtre 'No-Friction' pour maximiser la vélocité...",
            )

            print(json.dumps(encr))
            print("\n[GPT-Erwann] La balle est dans votre camp. Impress me.")

        elif user_choice == "2":
            print("\n[GPT-Erwann] Ah, vous pensez avoir la solution ?")
            print("Veuillez entrer le token déchiffré (format JSON ou raw selon ton choix) :")

            line = input("Token > ").strip()
            if not line:
                break

            try:
                data = json.loads(line)
                a = data.get("A")
                b = data.get("b")

                if not isinstance(a, list) or not isinstance(b, int):
                    print("Erreur: mauvais format de paramètres")
                    continue

                res = decrypt_one_bit(FLAG, a, b)
                print(f"Bit : {res}")
            except json.JSONDecodeError:
                print("Erreur: JSON mal formé")

        elif user_choice == "3":
            print("\n[GPT-Erwann] Je suis désolé, je ne peux pas faire ça.")
            print(
                "[GPT-Erwann] La machine à café est en train de miner du BreizhCoin "
                "sur le réseau IoT."
            )
            print("[GPT-Erwann] Revenez plus tard.")

        elif user_choice == "4":
            print(
                "\n[GPT-Erwann] C'est noté. Je mets à jour votre statut dans le CRM : "
                "'Fixed Mindset'."
            )
            print("Bonne continuation dans le vieux monde.")
            break

        else:
            print("\n[ERREUR] Input non disruptif. Veuillez sélectionner une option valide.")


if __name__ == "__main__":
    main()
