# Pour executer ce script facilement, utilisez : uv run solve.py
# Telecharger uv : https://docs.astral.sh/uv/

# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "qiling>=1.4.6",
# ]
# ///

from __future__ import annotations

import argparse
import importlib
import os
import shutil
from contextlib import ExitStack
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

DEFAULT_FLAG_LENGTH = 37
DEFAULT_COMPARE_OFFSET = 0x29AA
DEFAULT_BINARY = Path(__file__).resolve().parent.parent / "files" / "bs_emulated_trust"
DEFAULT_ROOTFS = None
REQUIRED_ROOTFS_FILES = (
    (Path("/lib64/ld-linux-x86-64.so.2"), Path("lib64/ld-linux-x86-64.so.2")),
    (
        Path("/lib64/ld-linux-x86-64.so.2"),
        Path("usr/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2"),
    ),
    (
        Path("/lib/x86_64-linux-gnu/libc.so.6"),
        Path("lib/x86_64-linux-gnu/libc.so.6"),
    ),
    (
        Path("/lib/x86_64-linux-gnu/libc.so.6"),
        Path("usr/lib/x86_64-linux-gnu/libc.so.6"),
    ),
)


def parse_args() -> argparse.Namespace:
    """Build and parse command-line arguments for the solver."""
    parser = argparse.ArgumentParser(
        description=(
            "Extract the expected flag by hooking the comparison routine in "
            "the emulated-trust binary with Qiling."
        )
    )
    parser.add_argument(
        "binary",
        nargs="?",
        default=str(DEFAULT_BINARY),
        help=f"Path to the challenge binary (default: {DEFAULT_BINARY})",
    )
    parser.add_argument(
        "rootfs",
        nargs="?",
        default=DEFAULT_ROOTFS,
        help=(
            "Path to the Qiling rootfs. Default: create a temporary minimal rootfs "
            "with the host loader and libc."
        ),
    )
    parser.add_argument(
        "--flag-length",
        type=int,
        default=DEFAULT_FLAG_LENGTH,
        help=f"Length of the candidate input sent to stdin (default: {DEFAULT_FLAG_LENGTH})",
    )
    parser.add_argument(
        "--compare-offset",
        type=lambda value: int(value, 0),
        default=DEFAULT_COMPARE_OFFSET,
        help=(
            "Instruction offset where the compared byte is available in RAX "
            f"(default: {DEFAULT_COMPARE_OFFSET:#x})"
        ),
    )
    return parser.parse_args()


def load_qiling() -> tuple[Any, Any, Any]:
    """Import Qiling lazily so the script can fail with a clear installation hint."""
    try:
        qiling_module = importlib.import_module("qiling")
        qiling_const_module = importlib.import_module("qiling.const")
        qiling_pipe_module = importlib.import_module("qiling.extensions.pipe")
    except ModuleNotFoundError as error:
        raise RuntimeError(
            "Qiling is not installed. Run `uv run solve.py --help` or install the dependency with `uv sync`."
        ) from error

    return (
        qiling_module.Qiling,
        qiling_const_module.QL_VERBOSE,
        qiling_pipe_module,
    )


def ensure_binary_exists(binary_path: Path) -> None:
    """Validate that the target challenge binary is present before starting Qiling."""
    if not binary_path.is_file():
        raise FileNotFoundError(f"Challenge binary not found: {binary_path}")


def populate_rootfs(rootfs_path: Path) -> None:
    """Create the minimal runtime files Qiling needs for this dynamically linked ELF."""
    for host_path, relative_path in REQUIRED_ROOTFS_FILES:
        if not host_path.exists():
            raise FileNotFoundError(
                f"Required host runtime file is missing: {host_path}"
            )

        destination = rootfs_path / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)

        if not destination.exists():
            shutil.copy2(host_path, destination)

    for directory in ("tmp", "proc", "dev"):
        (rootfs_path / directory).mkdir(exist_ok=True)


def prepare_rootfs(rootfs_argument: str | None, stack: ExitStack) -> Path:
    """Return a usable rootfs path, creating a temporary one when no path is supplied."""
    if rootfs_argument is None:
        temporary_rootfs = stack.enter_context(
            TemporaryDirectory(prefix="emulated-trust-rootfs-")
        )
        rootfs_path = Path(temporary_rootfs)
    else:
        rootfs_path = Path(rootfs_argument).expanduser().resolve()
        rootfs_path.mkdir(parents=True, exist_ok=True)

    populate_rootfs(rootfs_path)
    return rootfs_path


def main() -> None:
    args = parse_args()
    binary_path = Path(args.binary).expanduser().resolve()
    extracted_chars: list[str] = []
    ensure_binary_exists(binary_path)
    qiling_class, ql_verbose, pipe_module = load_qiling()

    def dump_character(ql: Any) -> None:
        # Capture the byte produced by the comparator and keep execution on track.
        extracted_chars.append(chr(ql.arch.regs.rax & 0xFF))
        ql.arch.regs.rax = ql.arch.regs.r13

    with ExitStack() as stack:
        rootfs_path = prepare_rootfs(args.rootfs, stack)

        ql = qiling_class([str(binary_path)], str(rootfs_path), verbose=ql_verbose.OFF)

        # Redirect output because we only care about the recovered bytes.
        devnull = stack.enter_context(open(os.devnull, "wb"))
        ql.os.stdout = devnull
        ql.os.stderr = devnull

        ql.os.stdin = pipe_module.SimpleInStream(0)
        ql.os.stdin.write(("A" * args.flag_length + "\n").encode())

        address = ql.loader.images[0].base + args.compare_offset
        ql.hook_address(dump_character, address)
        ql.run()

    print("".join(extracted_chars))


if __name__ == "__main__":
    main()
