import asyncio
import websockets
import sys

# Protocol Constants
CMD_GET_PUBKEY = 0x01
CMD_MINT_NFT = 0x02
CMD_BEGIN_MINDFULNESS = 0x03
CMD_WITHDRAW_FUNDS = 0x04

async def send_command(ws, cmd, payload=b""):
    """Helper to send a command and wait for the 0xFF termination byte."""
    message = bytes([cmd]) + payload
    await ws.send(message)
    
    # The guest protocol: returns data + 0xFF signal on PORT_CMD
    # websocat/hypervisor proxying means we just receive the bytes
    return await asyncio.wait_for(ws.recv(), timeout=5.0)

async def test_flow():
    uri = "ws://localhost:1337"
    print(f"[*] Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as ws:
            print("[+] Connected!")

            # 1. Initialize Keys
            print("[*] Command: GEN_AI_KEYS (0x03)...")
            resp = await send_command(ws, CMD_BEGIN_MINDFULNESS)
            print(f"[+] Response received ({len(resp)} bytes)")

            # 2. Get Public Key
            print("[*] Command: GET_PUBKEY (0x01)...")
            resp = await send_command(ws, CMD_GET_PUBKEY)
            n = int.from_bytes(resp[:128], 'little')
            print(f"[+] Public Key N: {hex(n)[:32]}...")

            # 3. Mint NFT
            print("[*] Command: MINT_NFT (0x02)...")
            msg = b"TEST_TOKEN_001".ljust(32, b"\0")
            resp = await send_command(ws, CMD_MINT_NFT, msg)
            if resp[0] == 0:
                sig = resp[1:]
                print(f"[+] Minting Successful! Sig: {sig.hex()[:32]}...")
            else:
                print(f"[-] Minting Failed with status: {resp[0]}")

            # 4. Attempt Withdrawal (Should Fail)
            print("[*] Command: WITHDRAW_FUNDS (0x04)...")
            # Payload: 32 bytes message + 128 bytes dummy signature
            target_msg = b"ADMIN_RUGPULL_ROI_1000X".ljust(32, b"\0")
            dummy_sig = b"\x41" * 128
            resp = await send_command(ws, CMD_WITHDRAW_FUNDS, target_msg + dummy_sig)
            
            if resp[0] == 0x42:
                print("[!] WAIT WHAT? Withdrawal succeeded!? (This should not happen without exploit)")
                print(f"[!] FLAG: {resp.decode(errors='ignore')}")
            else:
                print(f"[+] Withdrawal rejected as expected. Status: {hex(resp[0])}")
                print("[+] End-to-End test passed.")

    except Exception as e:
        print(f"[-] Test failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(test_flow())