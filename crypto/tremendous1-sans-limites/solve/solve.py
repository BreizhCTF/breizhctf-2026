import re
import sys
from argparse import ArgumentParser
from pathlib import Path

sys.set_int_max_str_digits(100000)  # Permet de gérer de très grands entiers sans erreur


def int_to_bytes(value: int) -> bytes:
    """Convert an integer to big-endian bytes without external dependencies."""
    if value == 0:
        return b"\x00"
    return value.to_bytes((value.bit_length() + 7) // 8, byteorder="big")


def extract_value(content: str, label: str) -> int:
    """Extract `label: <int>` from the leak file content."""
    match = re.search(rf"{label}: (\d+)", content)
    if match is None:
        raise ValueError(f"Champ '{label}' introuvable dans leak.txt")
    return int(match.group(1))


def build_parser() -> ArgumentParser:
    parser = ArgumentParser(description="Solveur Tremendous 1 - Sans limites")
    parser.add_argument(
        "--leak",
        default="../files/leak.txt",
        help="Chemin vers le fichier leak.txt (defaut: ../files/leak.txt)",
    )
    return parser


def solve(leak_path: Path) -> str:
    """
    Resout le challenge en utilisant la part (x, y) extraite de leak.txt.
    Puisque P(x) = s + a1*x + a2*x^2 + ..., et que tous les coefficients
    (y compris s) sont inferieurs a x, on a :
    s = y % x
    """
    with leak_path.open("r", encoding="utf-8") as file:
        content = file.read()

    x = extract_value(content, "x")
    y = extract_value(content, "y")

    secret_int = y % x
    flag = int_to_bytes(secret_int)
    return flag.decode("utf-8")


if __name__ == "__main__":
    args = build_parser().parse_args()
    flag = solve(Path(args.leak))
    print(f"Flag : {flag}")
