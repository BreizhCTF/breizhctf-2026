import argparse
import gzip
import struct
from pathlib import Path

from scapy.all import Raw, rdpcap


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "pcap_file",
        nargs="?",
        type=Path,
        default=Path("ghost_operator.pcap"),
        help="Path to the input pcap file",
    )
    return parser.parse_args()


def main(pcap_file: Path) -> None:
    pkts = rdpcap(str(pcap_file))

    chunks = {}
    for p in pkts:
        if not p.haslayer(Raw):
            continue
        d = bytes(p[Raw])
        if d[0] != 0xFD:
            continue
        mid = d[7] | (d[8] << 8) | (d[9] << 16)
        pay = d[10 : 10 + d[1]]
        if mid == 130:
            sz = struct.unpack_from("<I", pay, 0)[0]
            nb = struct.unpack_from("<H", pay, 8)[0]
            csz = pay[11]
        if mid == 131:
            chunks[struct.unpack_from("<H", pay, 0)[0]] = pay[2:]

    raw = b""
    for i in range(nb):
        raw += chunks[i][: min(csz, sz - len(raw))]

    print(gzip.decompress(raw).decode())


if __name__ == "__main__":
    args = parse_args()
    main(args.pcap_file)
