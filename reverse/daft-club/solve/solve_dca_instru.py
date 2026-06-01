#!/usr/bin/env python3
import ctypes
import random
import pyqbdi

from instrument import load_wb, make_vm
from make_lib import build_lib


ROUND0_LAST_WRITE_RVA = 0xe06     # marks end of round 0 in wb_aes_encrypt

SR = [0, 5, 10, 15, 4, 9, 14, 3, 8, 13, 2, 7, 12, 1, 6, 11]

AES_SBOX = [
    0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
    0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
    0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
    0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
    0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
    0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
    0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
    0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
    0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
    0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
    0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
    0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
    0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
    0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
    0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
    0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16,
]

GROUND_TRUTH = bytes.fromhex("9fc162d13d99a742ab4780170af035a3")

def gf_mul(a: int, b: int) -> int:
    """Multiply in GF(2^8) with AES polynomial 0x11b."""
    r = 0
    for _ in range(8):
        if b & 1:
            r ^= a
        hi = a & 0x80
        a = ((a << 1) & 0xff)
        if hi:
            a ^= 0x1b
        b >>= 1
    return r


def tyi_word_bytes(s: int, row: int) -> list[int]:
    """
    The 4 bytes of Tyi[row](s).  Matches Chow's definition:
      Tyi[0] = (02s, 01s, 01s, 03s)
      Tyi[1] = (03s, 02s, 01s, 01s)
      Tyi[2] = (01s, 03s, 02s, 01s)
      Tyi[3] = (01s, 01s, 03s, 02s)
    """
    mults = {
        0: (0x02, 0x01, 0x01, 0x03),
        1: (0x03, 0x02, 0x01, 0x01),
        2: (0x01, 0x03, 0x02, 0x01),
        3: (0x01, 0x01, 0x03, 0x02),
    }[row]
    return [gf_mul(c, s) for c in mults]


def tyi_nibbles(s: int, b: int) -> list[int]:
    """
    Return the 8 nibbles (in nibble-position order 0..7, low-to-high) of
    the Tyi[SR[b] % 4](s) packed uint32 (little-endian byte order).

    Index i in [0..7] corresponds to (word >> (4*i)) & 0xF.
    """
    row = SR[b] % 4
    bs = tyi_word_bytes(s, row)
    nibs = []
    for byte in bs:
        nibs.append(byte & 0xF)         # low nibble first (matches >> 4*even)
        nibs.append((byte >> 4) & 0xF)  # high nibble (matches >> 4*odd)
    return nibs



def _round0_reads(vm, encrypt_ptr, buffer_ptr, plaintext, max_reads=512):
    """Run an encryption, return list of (rva, addr, size) for size=4 reads
    that happen before the round-0 last write rva."""
    out_ptr = buffer_ptr + 16
    for i, v in enumerate(plaintext):
        ctypes.cast(buffer_ptr + i, ctypes.POINTER(ctypes.c_uint8))[0] = v

    state = vm.getGPRState()
    pyqbdi.simulateCall(state, 0x42424242, [buffer_ptr, out_ptr])
    vm.setGPRState(state)

    reads = []
    done = {"flag": False}

    def cb(vm, gpr, fpr, _):
        inst = vm.getInstAnalysis()
        rva  = inst.address - encrypt_ptr
        if rva >= ROUND0_LAST_WRITE_RVA:
            done["flag"] = True
            return pyqbdi.STOP
        for acc in vm.getInstMemoryAccess():
            if (acc.type & pyqbdi.MEMORY_READ) and acc.size == 4:
                reads.append((rva, acc.accessAddress, acc.size))
                if len(reads) >= max_reads:
                    return pyqbdi.STOP
        return pyqbdi.CONTINUE

    cbid = vm.addMemAccessCB(pyqbdi.MEMORY_READ_WRITE, cb, None)
    vm.run(encrypt_ptr, 0x42424242)
    vm.deleteInstrumentation(cbid)
    return reads


def find_tyi_bases(encrypt_ptr):

    vm  = make_vm(encrypt_ptr)
    buf = pyqbdi.allocateMemory(32)

    reads_a = _round0_reads(vm, encrypt_ptr, buf, [0] * 16)
    reads_b = _round0_reads(vm, encrypt_ptr, buf, [1] * 16)

    # Walk the two read streams in lockstep, find the first 16 positions
    # where addr_b - addr_a == 4  those are tyi_tab[0][b][0] vs [1].
    bases = []
    rvas  = []
    n = min(len(reads_a), len(reads_b))
    for i in range(n):
        ra, aa, _ = reads_a[i]
        rb, ab, _ = reads_b[i]
        if rb == ra and (ab - aa) == 4:
            # base addr = aa (since pt was 0)
            bases.append(aa)
            rvas.append(ra)
            if len(bases) == 16:
                break

    if len(bases) != 16:
        raise RuntimeError(
            f"only located {len(bases)}/16 tyi bases via delta-walk; "
            f"reads_a={len(reads_a)} reads_b={len(reads_b)}"
        )

    for test_v in (2, 7, 0xab):
        reads_t = _round0_reads(vm, encrypt_ptr, buf, [test_v] * 16)
        hit = 0
        for rva_b, base in zip(rvas, bases):
            expected = base + test_v * 4
            for rva, addr, _ in reads_t:
                if rva == rva_b and addr == expected:
                    hit += 1
                    break
        if hit != 16:
            raise RuntimeError(
                f"tyi base verification failed for v={test_v}: {hit}/16 matched"
            )

    return bases, rvas


def make_capture_tyi(tyi_bases):
    """Build a closure capture_tyi_round0(vm, encrypt_ptr, buffer_ptr, pt)."""
    # Precompute (lo, hi) bounds per byte index.
    bounds = [(base, base + 1024) for base in tyi_bases]

    def capture(vm, encrypt_ptr, buffer_ptr, plaintext):
        out_ptr = buffer_ptr + 16
        for i, v in enumerate(plaintext):
            ctypes.cast(buffer_ptr + i, ctypes.POINTER(ctypes.c_uint8))[0] = v

        state = vm.getGPRState()
        pyqbdi.simulateCall(state, 0x42424242, [buffer_ptr, out_ptr])
        vm.setGPRState(state)

        captured = [None] * 16
        remaining = {"n": 16}

        def cb(vm, gpr, fpr, _):
            for acc in vm.getInstMemoryAccess():
                if not (acc.type & pyqbdi.MEMORY_READ) or acc.size != 4:
                    continue
                addr = acc.accessAddress
                for b, (lo, hi) in enumerate(bounds):
                    if captured[b] is None and lo <= addr < hi:
                        captured[b] = acc.value & 0xFFFFFFFF
                        remaining["n"] -= 1
                        break
                if remaining["n"] == 0:
                    return pyqbdi.STOP
            return pyqbdi.CONTINUE

        cbid = vm.addMemAccessCB(pyqbdi.MEMORY_READ_WRITE, cb, None)
        vm.run(encrypt_ptr, 0x42424242)
        vm.deleteInstrumentation(cbid)

        if any(c is None for c in captured):
            missing = [b for b, c in enumerate(captured) if c is None]
            raise RuntimeError(f"missed tyi captures for bytes {missing}")
        return captured

    return capture


def canonical_partition(values: list[int]) -> tuple:
    """
    Relabel values by first-occurrence so equivalent partitions get the same
    tuple. E.g. [3,7,3,7,4] -> (0,1,0,1,2).
    """
    remap = {}
    out = []
    for v in values:
        if v not in remap:
            remap[v] = len(remap)
        out.append(remap[v])
    return tuple(out)


def recover_key_byte(b: int, plaintexts: list[list[int]],
                     tyi_outputs: list[list[int]],
                     verbose: bool = False) -> list[int]:

    N = len(plaintexts)

    # Observed partitions at each of 8 nibble positions of tyi_word[b].
    obs_words = [tyi_outputs[i][b] for i in range(N)]
    obs_partitions = []
    for p in range(8):
        nibs = [(w >> (4 * p)) & 0xF for w in obs_words]
        obs_partitions.append(canonical_partition(nibs))

    # For each candidate key k, count how many nibble positions p of the
    # tyi-output it can explain. A candidate explains position p if there
    # exists a predicted-nibble index q (also in 0..7) such that the
    # predicted partition equals obs_partitions[p].
    # Predicted nibbles depend only on s = SBox(pt[i][b] ^ k).
    survivors = []
    pt_b = [pt[b] for pt in plaintexts]

    for k in range(256):
        s_vals = [AES_SBOX[v ^ k] for v in pt_b]
        # Build the 8 predicted nibble streams and partitions.
        pred_partitions = set()
        for q in range(8):
            nibs = [tyi_nibbles(s, b)[q] for s in s_vals]
            pred_partitions.add(canonical_partition(nibs))

        # Count obs partitions that are matched by some predicted partition.
        match_count = sum(1 for op in obs_partitions if op in pred_partitions)
        if match_count > 0:
            survivors.append((k, match_count))

    # Best candidates are those matching the most nibble positions.
    survivors.sort(key=lambda x: -x[1])
    if verbose:
        top = survivors[:5]
        print(f"    byte {b:2d}: top candidates {[(hex(k), m) for k, m in top]}")

    max_match = survivors[0][1]
    best = [k for k, m in survivors if m == max_match]
    return best

def main():
    encrypt_ptr = load_wb()

    print("[*] Locating tyi_tab[0] base addresses …")
    tyi_bases, tyi_rvas = find_tyi_bases(encrypt_ptr)
    for i, (base, rva) in enumerate(zip(tyi_bases, tyi_rvas)):
        print(f"    byte {i:2d}: base={base:#x}  rva={rva:#x}")

    # Sanity: with pt = [v]*16 the 16 captured tyi words should be 16
    # distinct values (different K[b] xor'd in per position).
    vm  = make_vm(encrypt_ptr)
    buf = pyqbdi.allocateMemory(32)
    capture_tyi_round0 = make_capture_tyi(tyi_bases)
    sanity = capture_tyi_round0(vm, encrypt_ptr, buf, [0x42] * 16)
    print(f"[*] Sanity capture (pt=[0x42]*16): "
          f"{len(set(sanity))}/16 distinct tyi words")

    # Step 3  gather N random-plaintext traces.
    N = 64
    random.seed(0xC0FFEE)
    plaintexts = [[random.randint(0, 255) for _ in range(16)] for _ in range(N)]

    print(f"[*] Capturing tyi outputs for {N} random plaintexts …")
    tyi_outputs = []
    for i, pt in enumerate(plaintexts):
        tyi_outputs.append(capture_tyi_round0(vm, encrypt_ptr, buf, pt))
        if (i + 1) % 16 == 0:
            print(f"    {i + 1}/{N}")

    # Step 4  per-byte recovery.
    key = [0] * 16
    print("[*] Recovering key bytes …")
    for b in range(16):
        cands = recover_key_byte(b, plaintexts, tyi_outputs, verbose=True)
        if len(cands) != 1:
            print(f"    !! byte {b}: {len(cands)} candidates: "
                  f"{[hex(c) for c in cands]}")
            # Pick the candidate that matches the ground-truth iff present
            # (for now we still fail loudly if non-unique).
            raise RuntimeError(f"byte {b}: non-unique candidate set")
        key[b] = cands[0]
        print(f"    key[{b:2d}] = {key[b]:#04x} "
              f"(truth {GROUND_TRUTH[b]:#04x}) "
              f"{'OK' if key[b] == GROUND_TRUTH[b] else 'WRONG'}")

    recovered = bytes(key)
    print(f"\n[+] Recovered: {recovered.hex()}")
    print(f"[+] Expected : {GROUND_TRUTH.hex()}")
    assert recovered == GROUND_TRUTH, "mismatch"
    print("[+] MATCH")


if __name__ == "__main__":
    main()
