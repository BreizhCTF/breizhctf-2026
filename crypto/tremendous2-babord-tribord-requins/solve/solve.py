import argparse
import json
import re
from fractions import Fraction
from pathlib import Path

import requests
from Crypto.Util.number import long_to_bytes

from pwn import log


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Exploit LSB oracle pour Tremendous 2")
    parser.add_argument(
        "--url",
        default="http://127.0.0.1/",
        help="URL complete du challenge (ex: http://127.0.0.1/)",
    )
    parser.add_argument("--host", help="Host/IP du challenge (optionnel)")
    parser.add_argument("--port", type=int, help="Port du challenge (optionnel)")
    parser.add_argument(
        "--data-file",
        type=Path,
        default=Path(__file__).with_name("intercepted_data.json"),
        help="Chemin vers intercepted_data.json",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=5.0,
        help="Timeout HTTP en secondes",
    )
    return parser.parse_args()


def resolve_base_url(args: argparse.Namespace) -> str:
    if args.host and args.port:
        return f"http://{args.host}:{args.port}"
    return args.url.rstrip("/")


def solve(args: argparse.Namespace) -> None:
    base_url = resolve_base_url(args)
    api_url = f"{base_url}/api/verify"
    login_url = f"{base_url}/login"

    with args.data_file.open("r", encoding="utf-8") as f:
        data = json.load(f)
        n_value = int(data["public_parameters"]["n"])
        e_value = int(data["public_parameters"]["e"])
        c_val = data["intercepted_cookie"]["value"]
        c_admin = int(c_val, 16) if str(c_val).startswith("0x") else int(c_val)

    log.info(f"Parametres charges depuis {args.data_file}")
    log.info(f"N ({n_value.bit_length()} bits) : {hex(n_value)[:50]}...")
    log.info(f"E : {e_value}")
    log.info(f"C_admin (intercepte) : {hex(c_admin)[:50]}...")

    lower = Fraction(0)
    upper = Fraction(n_value)
    mult = pow(2, e_value, n_value)
    current_c = c_admin

    nb_steps = n_value.bit_length()
    progress = log.progress(f"Dechiffrage LSB Oracle ({nb_steps} requetes)")

    for i in range(nb_steps):
        current_c = (current_c * mult) % n_value
        resp = requests.post(
            api_url, json={"ticket": hex(current_c)}, timeout=args.timeout
        )
        resp.raise_for_status()
        res_json = resp.json()

        side = res_json.get("side", "")
        if "Tribord" in side:
            lower = (lower + upper) / 2
        elif "Babord" in side or "Bâbord" in side:
            upper = (lower + upper) / 2
        else:
            raise RuntimeError(f"Reponse inattendue de l'oracle: {res_json}")

        if i % 50 == 0:
            progress.status(f"Progression : {i}/{nb_steps}")

    progress.success("Attaque terminee")

    password_int = int(upper)
    password = long_to_bytes(password_int)
    found_password = password.decode(errors="ignore")
    log.success(f"Mot de passe dechiffre : {found_password}")

    log.info("Tentative de connexion au pont superieur")
    r_login = requests.post(
        login_url,
        data={"password": found_password},
        timeout=args.timeout,
    )
    r_login.raise_for_status()

    flag_match = re.search(r"BZHCTF\{.*?\}", r_login.text)
    if flag_match:
        log.success(f"FLAG RECUPERE : {flag_match.group(0)}")
    else:
        log.error("Flag non trouve dans la reponse")


if __name__ == "__main__":
    solve(parse_args())
