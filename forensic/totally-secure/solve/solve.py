#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

FLAG_PATTERN = re.compile(r"BZHCTF\{[^}\n]+\}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Extract the TLS private key from triage and recover the flag from the pcap."
    )
    parser.add_argument(
        "--pcap",
        type=Path,
        default=Path("../files/traffic.pcapng"),
        help="Path to the traffic capture (pcapng).",
    )
    parser.add_argument(
        "--triage",
        type=Path,
        default=Path("../files/triage_server.tar.gz"),
        help="Path to the triage archive (tar.gz).",
    )
    parser.add_argument(
        "--server-ip",
        default="10.90.35.19",
        help="Target HTTPS server IP used in the capture.",
    )
    parser.add_argument(
        "--server-port",
        type=int,
        default=443,
        help="Target HTTPS server port used in the capture.",
    )
    parser.add_argument(
        "--key-in-archive",
        default="triage_server/[root]/etc/nginx/ssl/server.key",
        help="Private key path inside the triage archive.",
    )
    return parser


def extract_key_from_archive(
    archive_path: Path, member_path: str, output_dir: Path
) -> Path:
    if not archive_path.is_file():
        raise FileNotFoundError(f"Archive not found: {archive_path}")

    with tarfile.open(archive_path, "r:gz") as tar:
        try:
            member = tar.getmember(member_path)
        except KeyError as exc:
            raise FileNotFoundError(
                f"Private key not found in archive: {member_path}"
            ) from exc

        tar.extract(member, path=output_dir)

    extracted_key = output_dir / member_path
    if not extracted_key.is_file():
        raise FileNotFoundError(f"Extracted key is missing: {extracted_key}")
    return extracted_key


def run_tshark(
    pcap_path: Path, server_ip: str, server_port: int, key_path: Path
) -> str:
    if not pcap_path.is_file():
        raise FileNotFoundError(f"PCAP not found: {pcap_path}")

    command = [
        "tshark",
        "-r",
        str(pcap_path),
        "-o",
        f"tls.keys_list:{server_ip},{server_port},http,{key_path}",
        "-Y",
        f"ip.addr=={server_ip} && http.file_data",
        "-T",
        "fields",
        "-e",
        "http.file_data",
    ]

    result = subprocess.run(command, check=True, capture_output=True, text=True)
    return result.stdout


def decode_http_file_data(raw_hex_lines: str) -> str:
    decoded_parts: list[str] = []
    for line in raw_hex_lines.splitlines():
        hex_line = line.strip()
        if not hex_line:
            continue
        if not re.fullmatch(r"[0-9a-fA-F]+", hex_line):
            continue
        if len(hex_line) % 2 != 0:
            continue

        decoded_parts.append(bytes.fromhex(hex_line).decode("utf-8", errors="ignore"))

    return "\n".join(decoded_parts)


def extract_flag(decoded_text: str) -> str:
    match = FLAG_PATTERN.search(decoded_text)
    if not match:
        raise ValueError("Flag not found in decrypted HTTP data.")
    return match.group(0)


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        pcap_path = args.pcap.expanduser().resolve()
        triage_path = args.triage.expanduser().resolve()

        with tempfile.TemporaryDirectory(prefix="totally-secure-") as tmp:
            tmp_path = Path(tmp)
            key_path = extract_key_from_archive(
                triage_path, args.key_in_archive, tmp_path
            )
            raw_hex = run_tshark(pcap_path, args.server_ip, args.server_port, key_path)
            decoded_text = decode_http_file_data(raw_hex)
            flag = extract_flag(decoded_text)

        print(flag)
        return 0
    except FileNotFoundError as exc:
        print(f"[!] {exc}", file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as exc:
        stderr = exc.stderr.strip() if exc.stderr else "<empty stderr>"
        print(
            f"[!] tshark failed (exit code {exc.returncode}): {stderr}", file=sys.stderr
        )
        return 2
    except ValueError as exc:
        print(f"[!] {exc}", file=sys.stderr)
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
