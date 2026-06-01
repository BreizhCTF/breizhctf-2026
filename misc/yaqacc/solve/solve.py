#!/usr/bin/env python3
"""Automated solver for YAQACC challenge service."""

import argparse
import io
import re
import socket
import time
from contextlib import redirect_stdout

from relang import Interpreter

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 1337
DEFAULT_BUFFER_SIZE = 4096
DEFAULT_TIMEOUT = 3.0
DEFAULT_RETRY_DELAY = 0.15
FLAG_PREFIX_TOKEN = "BZHCTF{"


def parse_args():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Solve YAQACC remotely using the provided local Relang interpreter.",
    )
    parser.add_argument("host", nargs="?", default=DEFAULT_HOST, help="Challenge host")
    parser.add_argument(
        "port", nargs="?", type=int, default=DEFAULT_PORT, help="Challenge port"
    )
    parser.add_argument(
        "--max-attempts",
        type=int,
        default=0,
        help="Maximum attempts before stopping (0 means infinite).",
    )
    parser.add_argument(
        "--buffer-size",
        type=int,
        default=DEFAULT_BUFFER_SIZE,
        help="Socket receive buffer size",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=DEFAULT_TIMEOUT,
        help="Socket timeout in seconds",
    )
    parser.add_argument(
        "--retry-delay",
        type=float,
        default=DEFAULT_RETRY_DELAY,
        help="Delay between attempts in seconds",
    )
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose logs")
    return parser.parse_args()


def connect(host, port):
    """Connect to the challenge server."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.connect((host, port))
    return sock


def solve_challenge(code):
    """Run the esolang code through the interpreter and return the result."""
    f = io.StringIO()
    with redirect_stdout(f):
        Interpreter(code, can_getattr=False)
    return f.getvalue().strip()


def strip_inline_comment(code):
    """Drop trailing challenge comments to avoid evaluating server hints."""
    return code.split("# ", 1)[0].strip() if "# " in code else code.strip()


def build_answer(code):
    """Build the payload to send back for one challenge line."""
    if code.startswith("@ µ exec"):
        return "<EOF>\n"
    if code == "*luck*":
        return "<EOF>\n"

    result = solve_challenge(code)
    if not result:
        return "<EOF>\n"
    return f"{result}\n<EOF>\n"


def extract_flag(text):
    """Try to extract the flag from server output."""
    direct_match = re.search(r"BZHCTF\{[^\n}]*\}", text)
    if direct_match:
        return direct_match.group(0)

    marker = "Here is your well deserved flag:"
    if marker not in text:
        return None

    tail = text.split(marker, 1)[1]
    for line in tail.splitlines():
        candidate = line.strip()
        if (
            candidate
            and not candidate.startswith("#")
            and not candidate.startswith("-")
        ):
            return candidate
    return None


def extract_flag_prefix_hint(text):
    """Extract the longest visible flag prefix hint (possibly without closing brace)."""
    hints = re.findall(r"BZHCTF\{[^\n}]*", text)
    if not hints:
        return None
    return max(hints, key=len)


def normalize_flag(candidate, prefix_hint):
    """Normalize partially recovered flags to a full BZHCTF format when possible."""
    if not candidate:
        return None
    if candidate.startswith(FLAG_PREFIX_TOKEN) and candidate.endswith("}"):
        return candidate
    if prefix_hint and candidate.startswith("_") and candidate.endswith("}"):
        return f"{prefix_hint}{candidate}"
    return candidate


def iter_ready_challenges(buffer):
    """Yield challenge lines that already reached the prompt."""
    pattern = re.compile(r"Solve:\s*(.*?)\n> ", re.DOTALL)
    cursor = 0
    while True:
        match = pattern.search(buffer, cursor)
        if not match:
            break
        raw_code = match.group(1).strip()
        yield match.start(), match.end(), strip_inline_comment(raw_code)
        cursor = match.end()


def run_attempt(args, attempt_number):
    """Run one full connection attempt. Return extracted flag on success."""
    sock = connect(args.host, args.port)
    sock.settimeout(args.timeout)
    if args.verbose:
        print(f"[attempt {attempt_number}] connected to {args.host}:{args.port}")

    buffer = ""
    prefix_hint = None
    try:
        while True:
            chunk = sock.recv(args.buffer_size)
            if not chunk:
                if args.verbose:
                    print(f"[attempt {attempt_number}] server closed connection")
                return normalize_flag(extract_flag(buffer), prefix_hint)

            decoded = chunk.decode("utf-8", errors="replace")
            buffer += decoded
            prefix_hint = extract_flag_prefix_hint(buffer) or prefix_hint

            for line in decoded.splitlines():
                stripped = line.strip()
                if stripped.startswith("#"):
                    print(f"[server] {stripped}")

            while True:
                parsed = list(iter_ready_challenges(buffer))
                if not parsed:
                    break

                start, end, code = parsed[0]
                if args.verbose:
                    print(f"[attempt {attempt_number}] solving: {code}")

                payload = build_answer(code)
                sock.sendall(payload.encode("utf-8"))
                buffer = buffer[end:]

            found_flag = normalize_flag(extract_flag(buffer), prefix_hint)
            if found_flag:
                return found_flag
    except socket.timeout:
        print(f"[attempt {attempt_number}] timed out")
        return normalize_flag(extract_flag(buffer), prefix_hint)
    except OSError as exc:
        print(f"[attempt {attempt_number}] socket error: {exc}")
        return normalize_flag(extract_flag(buffer), prefix_hint)
    finally:
        sock.close()


def main():
    args = parse_args()

    attempt = 1
    while args.max_attempts == 0 or attempt <= args.max_attempts:
        flag = run_attempt(args, attempt)
        if flag:
            print(f"[+] Final flag: {flag}")
            return
        print(f"[-] Attempt {attempt} ended without flag, retrying...")
        attempt += 1
        if args.retry_delay > 0:
            time.sleep(args.retry_delay)

    print("[!] Reached max attempts without retrieving the flag")


if __name__ == "__main__":
    main()
