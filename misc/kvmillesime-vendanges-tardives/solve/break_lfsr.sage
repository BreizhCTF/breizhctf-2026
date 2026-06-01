#!/usr/bin/env sage
from sage.all import *
import sys

MASK = 0xFFFFFFFFFFFFFFFF

def xorshift128_linear_step(s0, s1):
    x = s0
    y = s1
    s0 = y
    x ^^= (x << 23) & MASK
    t1 = (x >> 17)
    t2 = (y >> 26)
    s1 = x ^^ y ^^ t1 ^^ t2
    s1 &= MASK
    out = s1 ^^ y 
    return s0, s1, out

def int_to_vector(n, length):
    v = vector(GF(2), length)
    for i in range(length):
        if (n >> i) & 1:
            v[i] = 1
    return v

def vector_to_int(v):
    n = 0
    for i, bit in enumerate(v):
        if bit:
            n |= (1 << i)
    return n

def solve(captured_values):
    # 3 values -> 2 deltas -> 128 bits
    real_delta0 = captured_values[0] ^^ captured_values[1]
    real_delta1 = captured_values[1] ^^ captured_values[2]
    
    target_vector = vector(GF(2), 128)
    v_d0 = int_to_vector(real_delta0, 64)
    v_d1 = int_to_vector(real_delta1, 64)
    for i in range(64):
        target_vector[i] = v_d0[i]
        target_vector[64 + i] = v_d1[i]

    M_cols = []
    for bit_idx in range(128):
        test_seed = 1 << bit_idx
        t_s0 = test_seed & MASK
        t_s1 = (test_seed >> 64) & MASK
        
        # Simulate 3 steps to get L0, L1, L2
        s0_1, s1_1, out0 = xorshift128_linear_step(t_s0, t_s1)
        s0_2, s1_2, out1 = xorshift128_linear_step(s0_1, s1_1)
        _, _, out2 = xorshift128_linear_step(s0_2, s1_2)
        
        d0 = out0 ^^ out1
        d1 = out1 ^^ out2
        
        col = vector(GF(2), 128)
        vec_d0 = int_to_vector(d0, 64)
        vec_d1 = int_to_vector(d1, 64)
        for k in range(64):
            col[k] = vec_d0[k]
            col[64 + k] = vec_d1[k]
        M_cols.append(col)

    M = Matrix(GF(2), M_cols).transpose()
    solution_vec = M.solve_right(target_vector)

    full_seed = vector_to_int(solution_vec)
    curr_s0 = full_seed & MASK
    curr_s1 = (full_seed >> 64) & MASK
    
    # Re-generate outputs to find secret
    # State before L0 is full_seed
    curr_s0, curr_s1, L0 = xorshift128_linear_step(curr_s0, curr_s1)
    curr_s0, curr_s1, L1 = xorshift128_linear_step(curr_s0, curr_s1)
    curr_s0, curr_s1, L2 = xorshift128_linear_step(curr_s0, curr_s1)
    
    secret = captured_values[0] ^^ L0
    
    # Predict L3 ^ secret
    # State is now after L2 (which matches the guest state after 3 GET + 3 restores)
    _, _, L3 = xorshift128_linear_step(curr_s0, curr_s1)
    prediction = L3 ^^ secret
    
    return secret, prediction

if __name__ == "__main__":
    if len(sys.argv) < 4:
        sys.exit(1)
    captured = [int(x, 0) for x in sys.argv[1:4]]
    res = solve(captured)
    if res:
        secret, pred = res
        sys.stderr.write(f"[*] Recovered Secret: {hex(secret)}\n")
        print(f"SECRET:{hex(secret)}")
        print(f"PREDICTION:{pred:016x}")
