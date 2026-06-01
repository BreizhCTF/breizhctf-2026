#!/usr/bin/env python3
"""Solve script for the "Weaponised Polyglot" challenge.

The remote runner executes the same source through 7 different interpreters
(python, sqlite3, bash, ruby, perl, lua, php). If, for every interpreter,
the stdout contains the per-request nonce stored in /tmp/flag.txt, the
frontend returns the real flag.

We submit a single polyglot whose effect under every interpreter boils down
to printing the contents of /tmp/flag.txt.
"""

import argparse
import base64
import json
import sys
import urllib.request

# Polyglot taken from solve/WRITEUP.md - reads /tmp/flag.txt under every
# interpreter the runner supports (python, sqlite3, bash, ruby, perl, lua,
# php).
POLYGLOT = (
    's="`cat flag.txt >/proc/$$/fd/1`"\n'
    "g=1--1;''''# <?php echo file_get_contents('flag.txt') ?>\n"
    "a=g;s=0--1;%{\n"
    'print(io.open("flag.txt", "rb"):read());\n'
    "--}\n"
    "--#'''\n"
    "\n"
    "s=1--1;print(open('flag.txt').read())\n"
    '--"""\n'
    "--[[\n"
    ";\n"
    "SELECT readfile('flag.txt');\n"
    '--"""#]];b=g;s=1--=a=g;open(F,"flag.txt");print(<F>);\n'
)


def submit(base_url: str, language: str, code: str, timeout: int) -> str:
    """POST `code` to `/run` and return the decoded output string."""
    url = base_url.rstrip("/") + "/run"
    payload = json.dumps({"language": language, "code": code}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = json.loads(resp.read())
    return base64.b64decode(body["output"]).decode("utf-8", errors="replace")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Solve the Weaponised Polyglot challenge.",
    )
    parser.add_argument(
        "-u",
        "--url",
        default="http://127.0.0.1",
        help="Base URL of the challenge frontend (default: %(default)s).",
    )
    parser.add_argument(
        "-l",
        "--language",
        default="all",
        help=(
            "Language selector to send to /run. Use 'all' (default) to "
            "obtain the flag; any single language is useful for debugging."
        ),
    )
    parser.add_argument(
        "-t",
        "--timeout",
        type=int,
        default=30,
        help="HTTP timeout in seconds (default: %(default)s).",
    )
    parser.add_argument(
        "--code",
        help="Override the default polyglot with a custom payload.",
    )
    parser.add_argument(
        "--code-file",
        help="Read the payload from a file instead of using the default polyglot.",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Print the raw response output as well as the flag.",
    )
    args = parser.parse_args()

    if args.code is not None:
        code = args.code
    elif args.code_file is not None:
        with open(args.code_file, "r", encoding="utf-8") as fh:
            code = fh.read()
    else:
        code = POLYGLOT

    output = submit(args.url, args.language, code, args.timeout)

    if args.verbose or args.language != "all":
        print("--- runner output ---")
        print(output)
        print("--- end output ---")

    if args.language == "all" and output.startswith("BZHCTF{"):
        print(output)
        return 0

    if args.language != "all":
        return 0

    print("Flag not recovered.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
