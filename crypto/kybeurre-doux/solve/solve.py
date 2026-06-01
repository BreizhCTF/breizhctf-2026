#!/usr/bin/env python3
import argparse
import json
import sys

import tqdm
from pwn import context, remote

context.log_level = 'error'

N = 64
Q = 3329
THRESHOLD_SCAN_BASE = Q // 4


def main(host: str, port: int) -> None:
    """Solving the challenge."""
    io = remote(host, port)
    flag_so_far = ''

    for i in tqdm.tqdm(range(N)):
        a = [0] * N
        a[i] = 1
        for j in range(127):
            b = THRESHOLD_SCAN_BASE + j
            io.sendline(b'2')
            io.sendline(json.dumps({'A': a, 'b': b}).encode())
            io.recvuntil(b'Bit : ')
            res = int(io.recvline().decode().strip())

            if res == 1:
                # Le switch 0 -> 1 vient d'avoir lieux
                flag_so_far += chr(j)
                break

        if j == 127:
            print("FAIL")
            sys.exit(1)

        print(f"{flag_so_far=}")


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
