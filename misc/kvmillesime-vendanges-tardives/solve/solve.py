#!/usr/bin/env python3
import argparse
from typing import Any, cast

from pwn import remote


def parse_args(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--ip",
        default="localhost",
        help="Remote service IP or hostname",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=1337,
        help="Remote service port",
    )
    return parser.parse_args(argv)


def solve(host, port):
    p = remote(host, port)

    # 1. Synchronize the current value of N.
    p.recvuntil(b"> ")
    p.sendline(b"1")
    p.recvuntil(b"Vibration: ")
    n1 = int(p.recvline().strip(), 16)
    print(f"Initial N observed: {hex(n1)}")

    # 2. Save the PRNG state
    print("Creating snapshot...")
    p.recvuntil(b"> ")
    p.sendline(b"2")

    # 3. N is not saved. Observe the next increment by calling GET again.
    p.recvuntil(b"> ")
    p.sendline(b"1")
    p.recvuntil(b"Vibration: ")
    n2 = int(p.recvline().strip(), 16)
    increment = n2 - n1
    print(f"Next increment observed: {hex(increment)}")

    # 4. Restore the snapshot.
    # This resets the PRNG to the state it was in before the second GET. But N is not saved, so it keeps increasing.
    print("Restoring snapshot...")
    p.recvuntil(b"> ")
    p.sendline(b"3")
    p.recvuntil(b"Identifiant de vie : ")
    p.sendline(b"0")

    # 5. Predict the next value.
    target = n2 + increment
    print(f"Predicted target: {hex(target)}")

    # 6. Send the guess and get the flag.
    p.recvuntil(b"> ")
    p.sendline(b"4")
    p.recvuntil("Votre prédiction (hex) : ".encode())
    p.sendline(hex(target)[2:].encode())

    p.recvuntil(b"BZHCTF{", timeout=cast(Any, 15.0))
    flag = "BZHCTF{" + p.recvuntil(b"}").decode()
    print(f"\n[+] Flag: {flag}")

    p.close()


def main(argv=None):
    args = parse_args(argv)
    solve(args.ip, args.port)


if __name__ == "__main__":
    main()
