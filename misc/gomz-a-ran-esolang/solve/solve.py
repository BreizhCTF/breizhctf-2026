#!/usr/bin/env python3
"""Automates the RELANG challenge and retrieves the final flag.

The script sends the seven known RELANG programs (from the writeup) to the
remote service and extracts the resulting flag.
"""

import argparse
import re
from dataclasses import dataclass
from typing import Sequence

from pwnlib.tubes.tube import tube

from pwn import context, remote

FLAG_PATTERN = re.compile(rb"BZHCTF\{[^}]+\}")

TASK_PROGRAMS: tuple[str, ...] = (
    "! + $ $",
    "! / + @ $ | $ 0",
    "! / + @ ° @ $ | $ 0",
    "& (.)(?:(.)(?:(.)(?:(.)(?:(.)(?:(.)\\5|\\5?)\\4|\\4?)\\3|\\3?)\\2|\\2?))?\\1 ~ 1 $ .1.",
    "@ / + @ § § ~ o $ \\[0-[0-o]\\]",
    "! + ¤ 0 *b ¤ ° -1 @ ! @ ~ . ¤ 0 *b @ / + @ § § ~ o - $ 1 \\[1-[1-o]\\]",
    "_ ((([♛♜](.{9}\\ )*.{9})♔)|((♔(.{9}\\ )*.{9})[♛♜])|(([♛♜](\\ {0,6}))♔)|((♔(\\ {0,6}))[♛♜]))|((([♛♝].{10}(\\ .{10})*)♔)|((♔.{10}(\\ .{10})*)[♛♝])|(([♛♝].{8}(\\ .{8})*)♔)|((♔.{8}(\\ .{8})*)[♛♝])) / + @ : @ + aa @ : @ $ | 8 0",
)


@dataclass(frozen=True)
class SolveConfig:
    """Runtime configuration for the solver.

    Attributes:
        host: Target host exposing the challenge service.
        port: Target TCP port.
        timeout: Read/write timeout in seconds.
    """

    host: str
    port: int
    timeout: float


def build_parser() -> argparse.ArgumentParser:
    """Create the CLI parser.

    Returns:
        A configured argument parser using positional optional arguments with
        defaults.
    """

    parser = argparse.ArgumentParser(
        description=(
            "Solve Gomz a ran Esolang by sending all RELANG answers and "
            "printing the recovered flag."
        )
    )
    parser.add_argument(
        "host",
        nargs="?",
        default="127.0.0.1",
        help="Challenge host (default: 127.0.0.1).",
    )
    parser.add_argument(
        "port",
        nargs="?",
        type=int,
        default=1337,
        help="Challenge TCP port (default: 1337).",
    )
    parser.add_argument(
        "timeout",
        nargs="?",
        type=float,
        default=10.0,
        help="Socket timeout in seconds (default: 10.0).",
    )
    return parser


def send_programs(conn: tube, programs: Sequence[str]) -> None:
    """Send each RELANG program when prompted.

    Args:
        conn: Established pwntools connection.
        programs: RELANG programs to submit for each task.
    """

    for program in programs:
        conn.recvuntil(b"> ")
        conn.sendline(program.encode("utf-8"))


def extract_flag(output: bytes) -> str:
    """Extract the flag from service output.

    Args:
        output: Raw bytes collected from the service.

    Returns:
        The decoded flag string.

    Raises:
        ValueError: If no flag is found in output.
    """

    match = FLAG_PATTERN.search(output)
    if match is None:
        raise ValueError("flag not found in service output")
    return match.group(0).decode("utf-8")


def solve(config: SolveConfig) -> str:
    """Run the end-to-end exploitation flow.

    Args:
        config: Runtime configuration.

    Returns:
        The challenge flag.
    """

    context.log_level = "warning"
    context.encoding = "utf-8"

    with remote(config.host, config.port, timeout=config.timeout) as conn:
        send_programs(conn, TASK_PROGRAMS)
        output = conn.recvall(timeout=config.timeout)

    return extract_flag(output)


def main() -> int:
    """CLI entrypoint.

    Returns:
        Process return code.
    """

    parser = build_parser()
    args = parser.parse_args()

    config = SolveConfig(host=args.host, port=args.port, timeout=args.timeout)
    flag = solve(config)
    print(flag)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
