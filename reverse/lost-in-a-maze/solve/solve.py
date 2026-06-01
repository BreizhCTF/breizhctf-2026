# Pour executer ce script facilement, utilisez : uv run solve.py
# Telecharger uv : https://docs.astral.sh/uv/

# /// script
# requires-python = ">=3.11"
# dependencies = ["scapy", "cryptography"]
# ///

from argparse import ArgumentParser
import hashlib
from typing import List, Iterable
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
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


def get_flag(payloads: Iterable[bytes]) -> str:
    last_decrypted_payload: bytes | None = None

    for payload in payloads:
        if last_decrypted_payload:
            digest = hashlib.sha256(last_decrypted_payload).digest()
            cipher = AESGCM(digest)
            nonce = digest[:12]

            decrypted_payload = cipher.decrypt(nonce, payload, None)
        else:
            decrypted_payload = payload

        last_decrypted_payload = decrypted_payload

    if last_decrypted_payload is None:
        raise ValueError("empty capture")

    return last_decrypted_payload.split(b"\x00", 1)[0].decode("utf-8")


def main() -> None:
    parser = ArgumentParser(description="Decrypt Lost in a Maze UDP capture.")
    parser.add_argument("pcap", help="pcap file containing the UDP exchange")
    arguments = parser.parse_args()

    packets = rdpcap(arguments.pcap)
    payloads = get_packets_payload(packets)
    flag = get_flag(payloads)

    print(flag)


if __name__ == "__main__":
    main()
