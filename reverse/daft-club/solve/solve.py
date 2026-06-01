#!/usr/bin/env python3
"""
Daft Club — whitebox AES-128 key recovery via collision attack on round 0.

Suit la démarche du WRITEUP :
  - Le validator binaire embarque un whitebox AES-128 Chow (linear encoding).
    Les tables (tyi_tab, xor_tab, t10_tab, expected_ct) sont identifiables
    dans le binaire.
  - Pas besoin de bypasser le RASP : on attaque le whitebox directement à
    partir des tables extraites du binaire fourni dans sources.tar.gz.
  - Attaque par collision sur la sortie du round 0 pour récupérer la clé
    AES octet par octet (2 octets à la fois, 8 demi-colonnes).
  - La clé AES recouvrée est le flag :  BZHCTF{<hex 32>}
  - La CD-key (plaintext qui chiffre vers expected_ct) est soumise au
    serveur pour vérification.
"""

import argparse
import os
import random
import struct
import sys
import tarfile
import urllib.parse
import urllib.request


def _prompt(label, default=None):
    suffix = f" [{default}]" if default else ""
    try:
        v = input(f"{label}{suffix}: ").strip()
    except EOFError:
        v = ""
    return v or default


# ---------------------------------------------------------------------------
# Plain AES helpers (used to verify candidate keys)
# ---------------------------------------------------------------------------
SBOX = bytes([
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
])

def _xtime(x):
    return ((x << 1) ^ 0x1b) & 0xff if (x & 0x80) else (x << 1) & 0xff

MUL2 = [_xtime(i) for i in range(256)]
MUL3 = [MUL2[i] ^ i for i in range(256)]

# After ShiftRows, column c of state takes input bytes from these positions
COL_INPUTS = [
    [0, 5, 10, 15],
    [4, 9, 14, 3],
    [8, 13, 2, 7],
    [12, 1, 6, 11],
]


def aes_mc_byte(plain, key, col, row):
    """Compute MC(SR(SB(P xor K)))[col*4 + row] — one byte of the post-round-1
    state in plain AES."""
    ci = COL_INPUTS[col]
    a = SBOX[plain[ci[0]] ^ key[ci[0]]]
    b = SBOX[plain[ci[1]] ^ key[ci[1]]]
    c = SBOX[plain[ci[2]] ^ key[ci[2]]]
    d = SBOX[plain[ci[3]] ^ key[ci[3]]]
    if row == 0:
        return MUL2[a] ^ MUL3[b] ^ c ^ d
    if row == 1:
        return a ^ MUL2[b] ^ MUL3[c] ^ d
    if row == 2:
        return a ^ b ^ MUL2[c] ^ MUL3[d]
    return MUL3[a] ^ b ^ c ^ MUL2[d]


# ---------------------------------------------------------------------------
# Whitebox round 0 — tables sont extraites du binaire validator
# ---------------------------------------------------------------------------
# Offsets découverts par grep sur les premières valeurs connues.
TYI_OFFSET = 0x48240   # tyi_tab[0][0][0] = 0xc97cbabc (LE: bc ba 7c c9)
XOR_OFFSET = 0x12240   # xor_tab[0][0][0][0][0][0] = 0x07
EXPECTED_CT_OFFSET = 0x6c240  # 32 octets, ciphertext attendu (AES-ECB(plaintext))
EXPECTED_CT_LEN = 32


def extract_validator_binary(archive_path):
    """Lit le binaire `validator` depuis l'archive sources.tar.gz fournie."""
    if not os.path.isfile(archive_path):
        raise FileNotFoundError(f"archive introuvable : {archive_path}")
    with tarfile.open(archive_path) as tar:
        for m in tar.getmembers():
            if m.isreg() and os.path.basename(m.name) == "validator":
                f = tar.extractfile(m)
                if f is None:
                    continue
                return f.read()
    raise RuntimeError(
        f"binaire `validator` introuvable dans l'archive {archive_path}"
    )


def load_round0_tables(archive_path):
    data = extract_validator_binary(archive_path)
    # Sanity-check offsets — si le binaire change, on relocalise par recherche.
    if data[TYI_OFFSET:TYI_OFFSET + 4] != b"\xbc\xba\x7c\xc9":
        idx = data.find(b"\xbc\xba\x7c\xc9")
        if idx < 0:
            raise RuntimeError("tyi_tab introuvable dans le binaire")
        tyi_off = idx
    else:
        tyi_off = TYI_OFFSET
    if data[XOR_OFFSET] != 0x07 or data[XOR_OFFSET + 1] != 0x01:
        idx = data.find(bytes([0x07,0x01,0x00,0x0e,0x02,0x0b,0x03,0x06,
                                0x05,0x09,0x04,0x0f,0x0d,0x0a,0x0c,0x08]))
        if idx < 0:
            raise RuntimeError("xor_tab introuvable dans le binaire")
        xor_off = idx
    else:
        xor_off = XOR_OFFSET

    expected_ct = bytes(data[EXPECTED_CT_OFFSET:EXPECTED_CT_OFFSET + EXPECTED_CT_LEN])
    if len(expected_ct) != EXPECTED_CT_LEN:
        raise RuntimeError("expected_ct introuvable dans le binaire")

    tyi0 = [list(struct.unpack_from("<256I", data, tyi_off + b * 256 * 4))
            for b in range(16)]

    xor0 = [[[[[0]*16 for _ in range(16)] for _ in range(8)]
             for _ in range(3)] for _ in range(4)]
    off = xor_off
    for col in range(4):
        for gi in range(3):
            for bi in range(8):
                for a in range(16):
                    xor0[col][gi][bi][a] = list(data[off:off + 16])
                    off += 16
    return tyi0, xor0, expected_ct


def wb_round0(plain, tyi0, xor0):
    """16-octets en sortie du round 0 du whitebox (avec encoding F par octet)."""
    out = [0] * 16
    for col in range(4):
        ci = COL_INPUTS[col]
        W = [tyi0[ci[i]][plain[ci[i]]] for i in range(4)]
        fn = [0] * 8
        for bi in range(8):
            shift = 28 - bi * 4
            a = (W[0] >> shift) & 0xF
            b = (W[1] >> shift) & 0xF
            c = (W[2] >> shift) & 0xF
            d = (W[3] >> shift) & 0xF
            ab = xor0[col][0][bi][a][b]
            cd = xor0[col][1][bi][c][d]
            fn[bi] = xor0[col][2][bi][ab][cd]
        out[col * 4 + 0] = (fn[0] << 4) | fn[1]
        out[col * 4 + 1] = (fn[2] << 4) | fn[3]
        out[col * 4 + 2] = (fn[4] << 4) | fn[5]
        out[col * 4 + 3] = (fn[6] << 4) | fn[7]
    return out


# ---------------------------------------------------------------------------
# Attaque par collision
# ---------------------------------------------------------------------------
RELATIONSHIP = [
    {"col": 0, "affected_bytes": [0, 1, 2, 3],    "input_bytes": [0, 5, 10, 15]},
    {"col": 1, "affected_bytes": [4, 5, 6, 7],    "input_bytes": [4, 9, 14, 3]},
    {"col": 2, "affected_bytes": [8, 9, 10, 11],  "input_bytes": [8, 13, 2, 7]},
    {"col": 3, "affected_bytes": [12, 13, 14, 15],"input_bytes": [12, 1, 6, 11]},
]


def generate_traces(tyi0, xor0, n_traces, rel, half):
    i_idx = rel["input_bytes"][2 * half]
    j_idx = rel["input_bytes"][2 * half + 1]
    traces = []
    for _ in range(n_traces):
        plain = [0] * 16
        plain[i_idx] = random.randint(0, 255)
        plain[j_idx] = random.randint(0, 255)
        state = wb_round0(plain, tyi0, xor0)
        traces.append((plain, state))
    return traces


def find_collisions(traces, target_byte):
    cols = []
    n = len(traces)
    for i in range(n):
        for j in range(i + 1, n):
            if traces[i][1][target_byte] == traces[j][1][target_byte]:
                cols.append((traces[i][0], traces[j][0]))
    return cols


def _build_key(i, j, rel, half):
    k = [0] * 16
    k[rel["input_bytes"][2 * half]] = i
    k[rel["input_bytes"][2 * half + 1]] = j
    return k


def break_subkey(tyi0, xor0, rel, half, seed):
    """Récupère 2 octets de la clé AES : ceux indexés par
    rel['input_bytes'][2*half] et rel['input_bytes'][2*half+1]."""
    col = rel["col"]
    row = 0
    target_byte = rel["affected_bytes"][0]
    rng = random.Random(seed)

    # On accumule des collisions jusqu'à n'avoir qu'un seul candidat.
    candidates = None
    attempt = 0
    while attempt < 4:
        # Petit pool de traces qu'on grossit si besoin
        random.seed(seed + attempt)
        traces = generate_traces(tyi0, xor0, 64, rel, half)
        colls = find_collisions(traces, target_byte)
        for p0, p1 in colls:
            if candidates is None:
                candidates = []
                for i in range(256):
                    for j in range(256):
                        k = _build_key(i, j, rel, half)
                        if aes_mc_byte(p0, k, col, row) == aes_mc_byte(p1, k, col, row):
                            candidates.append((i, j))
            else:
                candidates = [
                    (i, j) for (i, j) in candidates
                    if aes_mc_byte(p0, _build_key(i, j, rel, half), col, row)
                    == aes_mc_byte(p1, _build_key(i, j, rel, half), col, row)
                ]
            if len(candidates) <= 1:
                break
        if candidates and len(candidates) == 1:
            break
        attempt += 1

    if not candidates:
        raise RuntimeError(f"Pas de candidat (col={col}, half={half})")
    if len(candidates) > 1:
        # Tie-break : essayer toutes les lignes restantes
        for p0, p1 in colls:
            for extra_row in (1, 2, 3):
                candidates = [
                    (i, j) for (i, j) in candidates
                    if aes_mc_byte(p0, _build_key(i, j, rel, half), col, extra_row)
                    == aes_mc_byte(p1, _build_key(i, j, rel, half), col, extra_row)
                ]
                if len(candidates) <= 1:
                    break
            if len(candidates) <= 1:
                break
    i, j = candidates[0]
    return _build_key(i, j, rel, half)


def recover_key(tyi0, xor0):
    final = [0] * 16
    seed_base = 0xC0DE
    for block, rel in enumerate(RELATIONSHIP):
        for half in (0, 1):
            print(f"  [+] colonne {block}, demi {half}…", end=" ", flush=True)
            sk = break_subkey(tyi0, xor0, rel, half, seed_base + block * 2 + half)
            non_zero = [(i, sk[i]) for i in range(16) if sk[i]]
            print("→", " ".join(f"K[{i}]=0x{v:02x}" for i, v in non_zero))
            for i in range(16):
                final[i] ^= sk[i]
    return final


# ---------------------------------------------------------------------------
# Vérification serveur + récupération de la CD-key
# ---------------------------------------------------------------------------
def derive_cd_key(aes_key_bytes, expected_ct):
    """Déchiffre expected_ct avec la clé AES recouvrée pour extraire la CD-key."""
    return _aes_ecb_decrypt(aes_key_bytes, expected_ct).rstrip(b"\x00")


def verify_remote(url, cd_key):
    redeem = urllib.parse.urljoin(url if url.endswith("/") else url + "/", "redeem")
    body = urllib.parse.urlencode({"key": cd_key.decode("ascii")}).encode()
    req = urllib.request.Request(
        redeem, data=body, method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            body = r.read().decode("utf-8", "replace")
            return "// ACCESS GRANTED" in body
    except Exception as e:
        print(f"  [!] requête HTTP échouée : {e}")
        return False


# Mini AES-128 ECB decrypt (pour éviter une dépendance externe)
def _aes_ecb_decrypt(key, ct):
    out = bytearray()
    for off in range(0, len(ct), 16):
        out += _aes128_decrypt_block(key, ct[off:off + 16])
    return bytes(out)


def _aes128_decrypt_block(key, block):
    rks = _key_expand(key)
    s = list(block)
    s = [s[i] ^ rks[10][i] for i in range(16)]
    s = _inv_shift_rows(s)
    s = [_INV_SBOX[b] for b in s]
    for r in range(9, 0, -1):
        s = [s[i] ^ rks[r][i] for i in range(16)]
        s = _inv_mix_columns(s)
        s = _inv_shift_rows(s)
        s = [_INV_SBOX[b] for b in s]
    s = [s[i] ^ rks[0][i] for i in range(16)]
    return bytes(s)


_INV_SBOX = bytes([SBOX.index(i) for i in range(256)])
_RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36]


def _key_expand(key):
    rks = [list(key)]
    for r in range(1, 11):
        prev = rks[-1]
        t = prev[-4:]
        t = [SBOX[t[1]] ^ _RCON[r], SBOX[t[2]], SBOX[t[3]], SBOX[t[0]]]
        new = []
        for i in range(16):
            if i < 4:
                new.append(prev[i] ^ t[i])
            else:
                new.append(prev[i] ^ new[i - 4])
        rks.append(new)
    return rks


def _inv_shift_rows(s):
    return [
        s[0],  s[13], s[10], s[7],
        s[4],  s[1],  s[14], s[11],
        s[8],  s[5],  s[2],  s[15],
        s[12], s[9],  s[6],  s[3],
    ]


def _gmul(a, b):
    p = 0
    for _ in range(8):
        if b & 1:
            p ^= a
        hi = a & 0x80
        a = (a << 1) & 0xff
        if hi:
            a ^= 0x1b
        b >>= 1
    return p


def _inv_mix_columns(s):
    out = [0] * 16
    for c in range(4):
        a = s[c*4:c*4 + 4]
        out[c*4 + 0] = _gmul(a[0],14) ^ _gmul(a[1],11) ^ _gmul(a[2],13) ^ _gmul(a[3], 9)
        out[c*4 + 1] = _gmul(a[0], 9) ^ _gmul(a[1],14) ^ _gmul(a[2],11) ^ _gmul(a[3],13)
        out[c*4 + 2] = _gmul(a[0],13) ^ _gmul(a[1], 9) ^ _gmul(a[2],14) ^ _gmul(a[3],11)
        out[c*4 + 3] = _gmul(a[0],11) ^ _gmul(a[1],13) ^ _gmul(a[2], 9) ^ _gmul(a[3],14)
    return out


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(
        description="Daft Club — récupère la clé AES (le flag) via collision attack."
    )
    ap.add_argument("--url", "-u", default=None,
                    help="URL de l'instance Daft Club (ex: http://127.0.0.1/)")
    ap.add_argument("--archive", "-a", default=None,
                    help="Chemin vers sources.tar.gz (contient le binaire validator)")
    args = ap.parse_args()

    url = args.url or _prompt("URL de l'instance", "http://127.0.0.1/")
    archive = args.archive or _prompt("Chemin vers sources.tar.gz",
                                      "../files/sources.tar.gz")
    if not url or not archive:
        print("[!] URL et archive sources.tar.gz requis.", file=sys.stderr)
        return 2
    archive = os.path.abspath(os.path.expanduser(archive))
    if not os.path.isfile(archive):
        print(f"[!] archive introuvable : {archive}", file=sys.stderr)
        return 2

    print(f"[*] Extraction du binaire validator depuis {archive} …")
    tyi0, xor0, expected_ct = load_round0_tables(archive)
    print(f"    expected_ct = {expected_ct.hex()}")

    print("[*] Attaque par collision sur la sortie du round 0 :")
    aes_key = recover_key(tyi0, xor0)
    aes_key_bytes = bytes(aes_key)
    aes_key_hex = aes_key_bytes.hex()
    print(f"[+] Clé AES récupérée : {aes_key_hex}")

    cd_key = derive_cd_key(aes_key_bytes, expected_ct)
    print(f"[+] CD-key déduite   : {cd_key.decode('ascii', errors='replace')}")

    print(f"[*] Vérification serveur sur {url} …")
    if verify_remote(url, cd_key):
        print("[+] Serveur : ACCESS GRANTED")
    else:
        print("[!] Le serveur n'a pas validé la CD-key (instance KO ou hors-ligne).")

    flag = f"BZHCTF{{{aes_key_hex}}}"
    print(f"\n[FLAG] {flag}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
