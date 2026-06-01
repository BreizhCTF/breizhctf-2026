from pwn import *
import tqdm
import re
import pprint
import argparse
def parse_metric(line):
    diag_metric = line[line.find("state: ")+len('state: '):].strip()
    return int(diag_metric)

def solve(host, port):
    HOST = host
    PORT = port
    MAX_TTY_BUF = 4096

    context.log_level = 'error'
    
    # The modulo 5 masks the top 4 bits (127, 126, 125, 124)
    # So we maintain exactly 16 seeds to cover all permutations of the blinded bits
    BLINDED_BITS = 5
    active_seeds = [prefix << (128 - BLINDED_BITS) for prefix in range(1 << BLINDED_BITS)]

    p = remote(HOST, PORT)
    p.recvuntil(b"STOCKBOT_BOOTING")
    
    print("[*] Starting cascade attack...")
    p.clean()

    for k in tqdm.tqdm(range(128 - BLINDED_BITS - 1, -1, -1)):
        payload = b''
        
        # 1. Generate the 16 queries 
        for seed_val in active_seeds:
            # We use the cascade probe: (1 << k) - 1
            q0 = seed_val | ((1 << k) - 1) 
            
            payload += b'license\n'
            payload += f'{q0:032x}'.encode()
        payload += f'logs {len(active_seeds)*3}'.encode()

        assert len(payload) < MAX_TTY_BUF, "Payload too long. Split"
        p.sendline(payload)
        
        # Gather infos
        p.recvuntil(b'------------')
        log_data = p.recvuntil(b'------------', drop=True).decode()
        lines = [l for l in log_data.strip().split('\n') if "TRADING_LATENCY_PROFILE" in l]
        
        # print(f"\n\n{len(lines)}")
        if len(lines) < len(active_seeds):
            print("Error. Too few lines. Here are the lines")
            print(len(log_data))
            pprint.pp(log_data)

        # The expected metric if S_k == 1, after the modulo 5 cut-off
        # -1 for the 127th bit never generates a borrow
        expected_metric = ((128 - k-1) // 5) * 5
        
        # 3. Process the 16 seeds 
        for i in range(len(active_seeds)):
            metric = parse_metric(lines[i])
            
            # If the metric matches our expected cascade, the bit must be 1
            if metric == expected_metric:
                active_seeds[i] |= (1 << k)
            else:
                # If the metric is 0 (or less than expected), the bit is 0
                pass 
        
    print("\nRecovery complete. Testing the 16 candidate keys against the server...")

    for final_key in active_seeds:
        p.sendline(b"license")
        p.send(f"{final_key:032x}".encode())
        p.clean(timeout=0.5)
        p.sendline(b'admin_token')
        ret = p.clean()
        if b'flag' in ret:
            print(ret.decode())
            break
    p.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Solve script for kvmillesime-mise-en-fut challenge")
    parser.add_argument("host", nargs="?", default="127.0.0.1", help="Target host (default: 127.0.0.1)")
    parser.add_argument("port", nargs="?", type=int, default=1337, help="Target port (default: 1337)")
    args = parser.parse_args()
    solve(args.host, args.port)
