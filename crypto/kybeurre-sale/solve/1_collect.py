import argparse
import json

import tqdm

from pwn import remote

# Configuration
NUM_SAMPLES = 6000  # Nombre de samples pour l'attaque
BATCH_SIZE = 500  # Nombre de requêtes envoyées d'un coup


def main(host: str, port: int) -> None:
    """Solving the challenge."""

    r = remote(host, port)

    samples = []

    r.recvuntil(b"> ")

    # Je n'ai pas envie de m'enbêter avec le calcul précis. Donc je mets de la marge
    num_batches = (NUM_SAMPLES // BATCH_SIZE) + 1

    for _ in tqdm.tqdm(range(num_batches)):
        if len(samples) > NUM_SAMPLES:
            break

        payload = b"cipher\n0\n" * BATCH_SIZE
        r.send(payload)

        print("Msg ssent")

        lines_received = 0
        while lines_received < BATCH_SIZE and len(samples) < NUM_SAMPLES:
            line = r.recvline(timeout=1)
            if not line:
                break  # Fin de flux ou timeout

            # Le serveur peut renvoyer le prompt collé au JSON ou sur une autre ligne
            # On filtre uniquement ce qui ressemble à du JSON
            line_str = line.decode(errors="ignore").strip()
            if "{" in line_str:
                line_str = line_str[line_str.find("{") :]
                data = json.loads(line_str)
                samples.append(data)
                lines_received += 1

    print(f"Got the samples. {len(samples)=}")

    r.clean(timeout=0.2)

    # Récupération du flag
    print("Collecte du flag")
    r.sendline(b"exportDB")
    line = r.recvline(timeout=1).decode().strip()
    enc_flag = line.strip()
    r.close()

    # Sauvegarde
    output = {
        "samples": samples,
        "enc_flag": enc_flag,
    }

    filename = "attack_data.json"
    with open(filename, "w") as f:
        json.dump(output, f)

    print("Données collectées")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "host",
        nargs="?",
        default="localhost",
        help="Target host (default: localhost)",
    )
    parser.add_argument(
        "port",
        nargs="?",
        type=int,
        default=9000,
        help="Target port (default: 9000)",
    )
    args = parser.parse_args()
    main(args.host, args.port)
