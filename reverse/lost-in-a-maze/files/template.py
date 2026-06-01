# Pour executer ce script facilement, utilisez : uv run template.py
# Telecharger uv : https://docs.astral.sh/uv/

# /// script
# requires-python = ">=3.11"
# dependencies = ["scapy"]
# ///

from argparse import ArgumentParser
from typing import List, Iterable
from scapy.all import Raw, UDP, rdpcap
from scapy.packet import Packet


def get_packets_payload(packets: Iterable[Packet]) -> List[bytes]:
    payloads: List[bytes] = []

    for packet in packets:
        if not packet.haslayer(UDP):
            continue

        udp = packet[UDP]

        if not udp.payload or not udp.haslayer(Raw):
            continue

        payloads.append(bytes(udp[Raw].load))

    return payloads


def main() -> None:
    parser = ArgumentParser(description="Extract UDP payloads from a capture.")
    parser.add_argument("pcap", help="pcap file containing the UDP exchange")
    arguments = parser.parse_args()

    packets = rdpcap(arguments.pcap)
    payloads = get_packets_payload(packets)

    for index, payload in enumerate(payloads, 1):
        print(f"packet {index}: {payload.hex()}")


if __name__ == "__main__":
    main()
