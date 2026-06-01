# Pour executer ce script facilement, utilisez : uv run solve.py
# Telecharger uv : https://docs.astral.sh/uv/

# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

import os
import re
import subprocess
from pathlib import Path
from tempfile import NamedTemporaryFile

MESSAGE = "There's nothing ⁢‍‌‌⁢⁢⁢⁢‍‌⁢‍⁤‌⁡⁢⁣⁤‍‌‌‌‍‌‍⁢⁡⁢⁢⁣⁢⁡‌⁤‌⁢‌⁢⁡⁢⁡‌‍⁢‌‍⁤⁡‍⁡⁢⁤‌⁡‍⁢⁢⁡‌‌‌‍‌‍⁢‌⁢⁢⁢⁢⁡⁢‌⁢⁢⁣‍⁢‍‌⁤‌‌⁣⁢‌‌⁢⁡⁣⁡‌‌⁣⁢⁣⁣⁡‌‌⁢‌‍⁢⁡⁢⁤⁢⁤‌⁢⁣⁡to see here..."
PASSWORD = "empty"


def solve():
    with NamedTemporaryFile("w", encoding="utf-8", delete=False) as file:
        file.write(MESSAGE)
        path = Path(file.name)

    try:
        # On peut soit coller la chaine dans https://stegcloak.surge.sh/ avec le mot
        # de passe, soit utiliser la CLI officielle avec `npx stegcloak` ou `pnpx
        # stegcloak`. Le premier lancement peut prendre un peu de temps le temps
        # d'installer le paquet. Ici on automatise juste la deuxieme option.
        result = subprocess.run(
            ["npx", "--yes", "stegcloak", "reveal", "-f", str(path)],
            check=True,
            capture_output=True,
            text=True,
            env={**os.environ, "STEGCLOAK_PASSWORD": PASSWORD},
        )

    finally:
        path.unlink(missing_ok=True)

    match = re.search(r"Secret:\s*(.+)", result.stdout)

    if match is None:
        raise ValueError(f"Sortie StegCloak inattendue :\n{result.stdout}")

    return match.group(1).strip()


def main():
    flag = solve()
    print(f"Flag : {flag}")


if __name__ == "__main__":
    main()
