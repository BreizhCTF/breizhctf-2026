#!/usr/bin/env python3
"""Attack script for Allo Papa Tango Charlie challenge."""
import argparse

import tqdm

from pwn import context, remote  # type: ignore[attr-defined]

PREFIX = "BZHCTF{"
MAX_LEN_FLAG = 100  # given in the challenge code


def main(host: str, port: int) -> None:
    """Main function to run the attack."""

    context.log_level = 'error'
    for strength in tqdm.tqdm(range(2 * MAX_LEN_FLAG)):
        io = remote(host, port)

        io.sendline(b"2")  # select ciphering in the menu
        io.sendline(str(strength).encode())
        io.recvuntil(b"Votre code :")
        io.recvline()  # clean the pending newline
        ciphered = io.recvline().decode()

        if PREFIX in ciphered:
            print(f"Found the flag: {ciphered}")
            break


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Attack on Allo Papa Tango Charlie challenge")
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
        default=1337,
        help="Target port (default: 1337)",
    )
    args = parser.parse_args()
    main(args.host, args.port)
