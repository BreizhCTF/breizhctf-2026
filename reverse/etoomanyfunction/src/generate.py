#!/usr/bin/env python3
import random

FLAG        = b"BZHCTF{100k_func_aint_too_many_4_u}"  
PASSWORD    = b"BREIZHCTF"
NUM_FUNCS   = 100_000
BUF_SIZE    = 64       
FLAG_LEN    = len(FLAG)
NOISE_START = 0        
OUTPUT_FILE = "challenge.c"



UNLOCK_MAGIC  = 0xDEAD       
ACC_NOISE_CNT = 20          

rng = random.Random(0xC0FFEE42)


all_indices = list(range(NUM_FUNCS))
rng.shuffle(all_indices)

GATE_IDX        = all_indices[0]                       
FLAG_WRITER_IDX = all_indices[1 : 1 + FLAG_LEN]       
ACC_NOISE_IDX   = all_indices[1 + FLAG_LEN : 1 + FLAG_LEN + ACC_NOISE_CNT * 2]


print(f"[*] Flag:          {FLAG.decode()}")
print(f"[*] Password:      {PASSWORD.decode()}")
print(f"[*] Gate function: f{GATE_IDX:05d}")
print(f"[*] Flag writers:  f{FLAG_WRITER_IDX[0]:05d} .. f{FLAG_WRITER_IDX[-1]:05d}")




func_type = {}

func_type[GATE_IDX] = ('gate',)

for slot, fidx in enumerate(FLAG_WRITER_IDX):
    func_type[fidx] = ('flag', slot, FLAG[slot])


for i in range(ACC_NOISE_CNT):
    noise_val = rng.randint(1, 0xFFFF)
    fidx_add = ACC_NOISE_IDX[i * 2]
    fidx_sub = ACC_NOISE_IDX[i * 2 + 1]
    func_type[fidx_add] = ('acc_noise', f'+= {noise_val}')
    func_type[fidx_sub] = ('acc_noise', f'-= {noise_val}')

noise_slots = list(range(0, BUF_SIZE))
for fidx in range(NUM_FUNCS):
    if fidx not in func_type:
        ns  = rng.choice(noise_slots)
        op  = rng.choice(['^', '+', '-'])
        val = rng.randint(1, 255)
        func_type[fidx] = ('noise', ns, op, val)

print(f"[*] Generating {OUTPUT_FILE}…")

CHUNK = 5000

with open(OUTPUT_FILE, 'w') as f:

    f.write("""\
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

static unsigned char buf[64];       /* noise buffer — never printed */
static unsigned char fbuf[36];      /* flag buffer — writers go here */
static unsigned int unlock_acc = 0; /* accumulator: must reach UNLOCK_MAGIC */

/* Forward declarations */
""")

    for i in range(0, NUM_FUNCS, CHUNK):
        chunk = range(i, min(i + CHUNK, NUM_FUNCS))
        f.write(''.join(f"void f{idx:05d}(void);\n" for idx in chunk))

    f.write("\n/* --- Function definitions --- */\n\n")

    for i in range(0, NUM_FUNCS, CHUNK):
        chunk = range(i, min(i + CHUNK, NUM_FUNCS))
        lines = []
        for idx in chunk:
            t = func_type[idx]
            if t[0] == 'gate':

                lines.append(
                    f"void f{idx:05d}(void) {{\n"
                    f"    char _b[16];\n"
                    f"    if (scanf(\"%15s\", _b) == 1 && strcmp(_b, \"{PASSWORD.decode()}\") == 0)\n"
                    f"        unlock_acc += {UNLOCK_MAGIC};\n"
                    f"}}\n"
                )
            elif t[0] == 'acc_noise':
                _, op_str = t
                lines.append(f"void f{idx:05d}(void) {{ buf[{rng.randint(0, BUF_SIZE-1)}] ^= {rng.randint(1,255)}; unlock_acc {op_str}; }}\n")
            elif t[0] == 'flag':
                _, slot, bval = t

                lines.append(f"void f{idx:05d}(void) {{ fbuf[{slot}] = {bval}; }}\n")
            else:
                _, ns, op, val = t
                lines.append(f"void f{idx:05d}(void) {{ buf[{ns}] {op}= {val}; }}\n")
        f.write(''.join(lines))

    f.write("\n/* --- main --- */\n")
    f.write(f"""
int main(void) {{
    memset(buf,  0, sizeof(buf));
    memset(fbuf, 0, sizeof(fbuf));

    /* Call every function in order */
""")

    BATCH = 10_000
    num_batches = (NUM_FUNCS + BATCH - 1) // BATCH
    for b in range(num_batches):
        f.write(f"    void batch_{b:02d}(void);\n")
    f.write("\n")
    for b in range(num_batches):
        f.write(f"    batch_{b:02d}();\n")

    f.write(f"""
    if (unlock_acc == {UNLOCK_MAGIC}) {{
        fbuf[{FLAG_LEN}] = '\\0';
        printf("Flag: %s\\n", fbuf);
    }} else {{
        puts("Wrong.");
    }}
    return 0;
}}
""")
    for b in range(num_batches):
        start = b * BATCH
        end   = min(start + BATCH, NUM_FUNCS)
        f.write(f"\nvoid batch_{b:02d}(void) {{\n")
        for idx in range(start, end):
            f.write(f"    f{idx:05d}();\n")
        f.write("}\n")

print(f"[+] Done! {OUTPUT_FILE} written.")
print(f"[+] Gate function index: {GATE_IDX}  →  f{GATE_IDX:05d}")
