#!/usr/bin/env python3
"""Allo Papa Tango Charlie challenge."""
import os
import random

FLAG: str = os.getenv("FLAG", r"BZHCTF{FAKE_FLAG}")
assert len(FLAG) < 100, "Flag too long"

KEY = random.randbytes(len(FLAG))


def gtfo_level(mesg: bytes, strength: int) -> bytes:
    """GTFO level function."""
    ciphered: list[int] | bytes = mesg
    shifted_key = list(KEY)

    if strength <= 0:
        # On est humain. Si l'utilisateur pense que sa requête est inutile,
        # on lui donne quand même un minimum d'importance
        return gtfo_level(mesg, 1)

    for _ in range(strength):
        ciphered = [a ^ k for a, k in zip(ciphered, shifted_key)]
        shifted_key = [shifted_key[-1]] + shifted_key[:-1]

    return bytes(ciphered)


def main() -> None:
    """Main function to run the authentication service."""

    print(
        "Bienvenue sur le service d'authentification du service client "
        "de Green, votre unique opérateur mobile préféré."
    )

    user_input = input(
        """Quelle opération souhaitez-vous effectuer ?
        (1) Souscrire à un nouveau contrat
        (2) Authentifier mon humanité
        (3) Résilier mon abonnement
        """
    )
    if user_input == "1":
        print("Chouette !")
    elif user_input == "2":

        print(
            "Pour valider la nécessité de votre besoin, et ainsi ne pas "
            "engorger les lignes de support, merci de renseigner à votre "
            "conseiller le code secret suivant."
        )
        print(
            "Afin de protéger la condfidentialité de nos échanges, "
            "nous avons chiffré votre code."
        )
        print(
            "Nous vous rappelons également que saisir une intensité plus "
            "haute augmente la priorité de votre demande."
        )

        input_strength = int(input("Quelle est l'intensité de votre besoin ?"))

        print("Votre code :")
        print(gtfo_level(FLAG.encode(), input_strength))
    else:
        print("Nous n'avons pas compris votre demande")


if __name__ == "__main__":
    main()
