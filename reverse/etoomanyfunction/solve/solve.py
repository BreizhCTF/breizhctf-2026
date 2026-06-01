#!/usr/bin/env python3
"""
Solver / analysis script for ETOOMANYFUNCTION.

The challenge binary has 100,000 functions named f00000..f99999.
One of them is the gate: it calls scanf + strcmp and sets unlocked=1
if the input matches the password.  35 others write flag bytes into
a hidden buffer fbuf[].  main prints fbuf only if unlocked.

Solve paths
-----------
Path 1 – strings / static search (fastest, ~10 seconds):
  The strcmp target "BREIZHCTF" is a string literal in .rodata.
  `strings ./challenge | grep -i breizh` finds it immediately.
  But that only gives the password, not the flag (flag bytes are
  scattered as integer constants across 35 functions).

Path 2 – dynamic: just run it (trivial once you have the password):
  echo "BREIZHCTF" | ./challenge

Path 3 – static analysis (intended RE path):
  1. In Ghidra/IDA, search for cross-references to the `strcmp` import.
     Only ONE function (f76266) calls it — that's the gate.
  2. Read the strcmp argument: "BREIZHCTF".
  3. Search for writes to `fbuf` (the second global buffer).
     35 functions do `fbuf[N] = K` — collect all (N, K) pairs.
  4. Sort by slot index → reconstruct flag bytes → BZHCTF{...}

Path 4 – gdb / dynamic instrumentation:
  Break on strcmp, read the second argument.
  Or break on printf, read the format string argument.
"""

import argparse
import subprocess
from pathlib import Path

PASSWORD = "BREIZHCTF"
BINARY = Path("../files/challenge_stripped")

# ── Path 1: static string extraction ─────────────────────────────────────────


def path1_strings():
    print("=" * 60)
    print("Path 1: strings")
    print("=" * 60)
    if not BINARY.exists():
        print(f"  [!] {BINARY} not found, run build.sh first")
        return
    r = subprocess.run(["strings", str(BINARY)], capture_output=True, text=True)
    hits = [
        line
        for line in r.stdout.splitlines()
        if "BREIZH" in line.upper() or "BZHCTF" in line.upper()
    ]
    for h in hits:
        print(f"  {h}")
    print()
    print("  → Password found in .rodata: BREIZHCTF")
    print("  → Flag NOT directly readable (bytes scattered as int constants)")


# ── Path 2: just run it ───────────────────────────────────────────────────────


def path2_run():
    print()
    print("=" * 60)
    print("Path 2: run the binary")
    print("=" * 60)
    if not BINARY.exists():
        print(f"  [!] {BINARY} not found, run build.sh first")
        return
    r = subprocess.run(
        str(BINARY), input=PASSWORD + "\n", capture_output=True, text=True
    )
    print(f"  Input:  {PASSWORD}")
    print(f"  Output: {r.stdout.strip()}")

    r2 = subprocess.run(
        str(BINARY), input="wrongpassword\n", capture_output=True, text=True
    )
    print("  Input:  wrongpassword")
    print(f"  Output: {r2.stdout.strip()}")


# ── Path 3: reconstruct flag from generator knowledge ────────────────────────


def path3_reconstruct():
    print()
    print("=" * 60)
    print("Path 3: reconstruct flag from fbuf[] write analysis")
    print("=" * 60)

    # A reverser with Ghidra would collect these from the 35 flag-writer funcs.
    # We reproduce the generator logic here to show what they'd find.
    import random

    FLAG = b"BZHCTF{100k_func_aint_too_many_4_u}"
    NUM_FUNCS = 100_000
    rng = random.Random(0xC0FFEE42)
    all_indices = list(range(NUM_FUNCS))
    rng.shuffle(all_indices)
    flag_writers = all_indices[1 : 1 + len(FLAG)]

    print(f'  Gate function:  f{all_indices[0]:05d}  (strcmp target = "{PASSWORD}")')
    print(f"  Flag writers:   {len(flag_writers)} functions")
    print()
    print("  Slot  Func     Byte  Char")
    print("  ----  -------  ----  ----")
    flag_bytes = []
    for slot, fidx in enumerate(flag_writers):
        bval = FLAG[slot]
        flag_bytes.append(bval)
        print(f"  {slot:3d}   f{fidx:05d}   {bval:3d}   {chr(bval)}")

    recovered = bytes(flag_bytes).decode()
    print()
    print(f"  Recovered flag: {recovered}")


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Solver / analysis script for ETOOMANYFUNCTION"
    )
    parser.add_argument(
        "binary",
        nargs="?",
        type=Path,
        default=Path("../files/challenge_stripped"),
        help="Path to the challenge binary (default: ../files/challenge_stripped)",
    )
    args = parser.parse_args()

    BINARY = args.binary
    path1_strings()
    path2_run()
    path3_reconstruct()
    print()
    print("=" * 60)
    print("FLAG: BZHCTF{100k_func_aint_too_many_4_u}")
    print("=" * 60)
