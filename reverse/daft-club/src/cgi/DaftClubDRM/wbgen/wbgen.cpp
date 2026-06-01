// Offline Chow et al. whitebox AES-128 table generator (nibble-separable encodings).
// Usage: ./wbgen <key_hex_32chars> "DAFT-XXXXX-XXXXX-XXXXX" [output_path]
// Output: DaftClubDRM/wb_tables.h

#include <cassert>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>

// GF(2^8), poly 0x11B

static uint8_t gf_mul(uint8_t a, uint8_t b) {
    uint8_t r = 0;
    while (b) {
        if (b & 1) r ^= a;
        uint8_t hi = a & 0x80;
        a <<= 1;
        if (hi) a ^= 0x1B;
        b >>= 1;
    }
    return r;
}

static uint8_t gf_inv(uint8_t a) {
    if (a == 0) return 0;
    for (int b = 1; b < 256; ++b)
        if (gf_mul(a, (uint8_t)b) == 1) return (uint8_t)b;
    return 0;
}

// AES S-box

static uint8_t AES_SBOX[256];
static uint8_t AES_SBOX_INV[256];

static uint8_t affine(uint8_t x) {
    uint8_t r = 0x63;
    for (int i = 0; i < 8; ++i) {
        uint8_t bit = ((x >> i) ^ (x >> ((i+4)%8)) ^ (x >> ((i+5)%8)) ^
                       (x >> ((i+6)%8)) ^ (x >> ((i+7)%8))) & 1;
        r ^= (bit << i);
    }
    return r;
}

static void build_sbox() {
    for (int i = 0; i < 256; ++i) {
        AES_SBOX[i] = affine(gf_inv((uint8_t)i));
        AES_SBOX_INV[AES_SBOX[i]] = (uint8_t)i;
    }
}

// AES key schedule

static const uint8_t RCON[10] = {
    0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1B, 0x36
};

static void aes_key_schedule(const uint8_t key[16], uint8_t rk[11][16]) {
    memcpy(rk[0], key, 16);
    for (int r = 1; r <= 10; ++r) {
        uint8_t* prev = rk[r-1];
        uint8_t* cur  = rk[r];
        cur[0] = AES_SBOX[prev[13]] ^ prev[0] ^ RCON[r-1];
        cur[1] = AES_SBOX[prev[14]] ^ prev[1];
        cur[2] = AES_SBOX[prev[15]] ^ prev[2];
        cur[3] = AES_SBOX[prev[12]] ^ prev[3];
        for (int i = 4; i < 16; ++i)
            cur[i] = prev[i] ^ cur[i-4];
    }
}

// Reference AES-128 ECB

static void aes_add_round_key(uint8_t s[16], const uint8_t rk[16]) {
    for (int i = 0; i < 16; ++i) s[i] ^= rk[i];
}

static void aes_sub_bytes(uint8_t s[16]) {
    for (int i = 0; i < 16; ++i) s[i] = AES_SBOX[s[i]];
}

static void aes_shift_rows(uint8_t s[16]) {
    uint8_t tmp[16];
    static const int SR[16] = {0,5,10,15, 4,9,14,3, 8,13,2,7, 12,1,6,11};
    for (int i = 0; i < 16; ++i) tmp[i] = s[SR[i]];
    memcpy(s, tmp, 16);
}

static void aes_mix_columns(uint8_t s[16]) {
    for (int j = 0; j < 4; ++j) {
        uint8_t a = s[4*j], b = s[4*j+1], c = s[4*j+2], d = s[4*j+3];
        s[4*j]   = gf_mul(2,a) ^ gf_mul(3,b) ^ c ^ d;
        s[4*j+1] = a ^ gf_mul(2,b) ^ gf_mul(3,c) ^ d;
        s[4*j+2] = a ^ b ^ gf_mul(2,c) ^ gf_mul(3,d);
        s[4*j+3] = gf_mul(3,a) ^ b ^ c ^ gf_mul(2,d);
    }
}

static void aes_ecb_encrypt(const uint8_t key[16], const uint8_t pt[16], uint8_t ct[16]) {
    uint8_t rk[11][16];
    aes_key_schedule(key, rk);
    uint8_t s[16];
    memcpy(s, pt, 16);
    aes_add_round_key(s, rk[0]);
    for (int r = 1; r <= 9; ++r) {
        aes_sub_bytes(s); aes_shift_rows(s); aes_mix_columns(s);
        aes_add_round_key(s, rk[r]);
    }
    aes_sub_bytes(s); aes_shift_rows(s); aes_add_round_key(s, rk[10]);
    memcpy(ct, s, 16);
}

// Splitmix64 RNG

struct Rng { uint64_t state; };

static uint64_t rng_next(Rng& r) {
    r.state += 0x9e3779b97f4a7c15ULL;
    uint64_t z = r.state;
    z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9ULL;
    z = (z ^ (z >> 27)) * 0x94d049bb133111ebULL;
    return z ^ (z >> 31);
}

static void rng_seed(Rng& r, const uint8_t key[16]) {
    uint64_t seed = 0;
    for (int i = 0; i < 16; ++i) seed = seed * 131 + key[i];
    r.state = seed ^ 0xdeadbeefcafeULL;
}

// Nibble permutations

using NibPerm = uint8_t[16];

static void gen_nibble_perm(NibPerm out, Rng& rng) {
    for (int i = 0; i < 16; ++i) out[i] = (uint8_t)i;
    for (int i = 15; i > 0; --i) {
        int j = (int)(rng_next(rng) % (uint64_t)(i + 1));
        uint8_t tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
}

static void invert_nibble_perm(const NibPerm p, NibPerm inv) {
    for (int i = 0; i < 16; ++i) inv[p[i]] = (uint8_t)i;
}

static uint8_t apply_nibble(const NibPerm p, uint8_t n) { return p[n & 0xF]; }

static uint8_t apply_enc_inv(const NibPerm hi_inv, const NibPerm lo_inv, uint8_t x) {
    return (uint8_t)((hi_inv[x >> 4] << 4) | lo_inv[x & 0x0F]);
}

// MixColumns Tyi contribution (big-endian uint32)

static uint32_t tyi_word(int row, uint8_t s) {
    uint8_t x2 = gf_mul(2, s), x3 = gf_mul(3, s);
    uint8_t b0, b1, b2, b3;
    switch (row) {
        case 0: b0=x2; b1=s;  b2=s;  b3=x3; break;
        case 1: b0=x3; b1=x2; b2=s;  b3=s;  break;
        case 2: b0=s;  b1=x3; b2=x2; b3=s;  break;
        case 3: b0=s;  b1=s;  b2=x3; b3=x2; break;
        default: b0=b1=b2=b3=0; break;
    }
    return ((uint32_t)b0 << 24) | ((uint32_t)b1 << 16) | ((uint32_t)b2 << 8) | b3;
}

// Table storage

struct WbTables {
    uint32_t tyi_tab[9][16][256];
    uint8_t  xor_tab[9][4][3][8][16][16];
    uint8_t  t10_tab[16][256];
    uint8_t  expected_ct[32];
};

// output[i] reads state[SR_map[i]] after ShiftRows
static const int SR_map[16] = {0,5,10,15, 4,9,14,3, 8,13,2,7, 12,1,6,11};

static const int SR_for_col[4][4] = {
    {0, 5, 10, 15}, {4, 9, 14, 3}, {8, 13, 2, 7}, {12, 1, 6, 11},
};

// Table generation

static void generate_wb_tables(const uint8_t key[16],
                                const uint8_t cd_key_str[22],
                                WbTables& T)
{
    uint8_t rk[11][16];
    aes_key_schedule(key, rk);

    Rng rng;
    rng_seed(rng, key);

    NibPerm enc_in_hi[10][16], enc_in_lo[10][16];
    NibPerm enc_in_hi_inv[10][16], enc_in_lo_inv[10][16];

    // Round 0 input encoding = identity
    for (int b = 0; b < 16; ++b)
        for (int n = 0; n < 16; ++n)
            enc_in_hi[0][b][n] = enc_in_lo[0][b][n] =
            enc_in_hi_inv[0][b][n] = enc_in_lo_inv[0][b][n] = (uint8_t)n;

    NibPerm tyi_out_nib[9][16][8];

    // Pass 1: XOR cascade tables + enc_in for rounds 1..9
    for (int r = 0; r < 9; ++r) {
        for (int j = 0; j < 4; ++j) {
            int b0 = SR_for_col[j][0], b1 = SR_for_col[j][1];
            int b2 = SR_for_col[j][2], b3 = SR_for_col[j][3];

            for (int nib = 0; nib < 8; ++nib) {
                NibPerm enc_A, enc_B, enc_C, enc_D, enc_AB, enc_CD, enc_final;
                NibPerm enc_A_inv, enc_B_inv, enc_C_inv, enc_D_inv, enc_AB_inv, enc_CD_inv;

                gen_nibble_perm(enc_A, rng); gen_nibble_perm(enc_B, rng);
                gen_nibble_perm(enc_C, rng); gen_nibble_perm(enc_D, rng);
                gen_nibble_perm(enc_AB, rng); gen_nibble_perm(enc_CD, rng);
                gen_nibble_perm(enc_final, rng);

                invert_nibble_perm(enc_A, enc_A_inv); invert_nibble_perm(enc_B, enc_B_inv);
                invert_nibble_perm(enc_C, enc_C_inv); invert_nibble_perm(enc_D, enc_D_inv);
                invert_nibble_perm(enc_AB, enc_AB_inv); invert_nibble_perm(enc_CD, enc_CD_inv);

                memcpy(tyi_out_nib[r][b0][nib], enc_A, 16);
                memcpy(tyi_out_nib[r][b1][nib], enc_B, 16);
                memcpy(tyi_out_nib[r][b2][nib], enc_C, 16);
                memcpy(tyi_out_nib[r][b3][nib], enc_D, 16);

                int out_byte = 4*j + nib/2;
                if (nib % 2 == 0) memcpy(enc_in_hi[r+1][out_byte], enc_final, 16);
                else               memcpy(enc_in_lo[r+1][out_byte], enc_final, 16);

                for (int a = 0; a < 16; ++a)
                    for (int b = 0; b < 16; ++b)
                        T.xor_tab[r][j][0][nib][a][b] =
                            apply_nibble(enc_AB, enc_A_inv[a] ^ enc_B_inv[b]);

                for (int c = 0; c < 16; ++c)
                    for (int d = 0; d < 16; ++d)
                        T.xor_tab[r][j][1][nib][c][d] =
                            apply_nibble(enc_CD, enc_C_inv[c] ^ enc_D_inv[d]);

                for (int ab = 0; ab < 16; ++ab)
                    for (int cd = 0; cd < 16; ++cd)
                        T.xor_tab[r][j][2][nib][ab][cd] =
                            apply_nibble(enc_final, enc_AB_inv[ab] ^ enc_CD_inv[cd]);
            }
        }

        for (int b = 0; b < 16; ++b) {
            invert_nibble_perm(enc_in_hi[r+1][b], enc_in_hi_inv[r+1][b]);
            invert_nibble_perm(enc_in_lo[r+1][b], enc_in_lo_inv[r+1][b]);
        }
    }

    for (int b = 0; b < 16; ++b) {
        invert_nibble_perm(enc_in_hi[0][b], enc_in_hi_inv[0][b]);
        invert_nibble_perm(enc_in_lo[0][b], enc_in_lo_inv[0][b]);
    }

    // Pass 2: TyiBox tables
    for (int r = 0; r < 9; ++r) {
        for (int b = 0; b < 16; ++b) {
            for (int x = 0; x < 256; ++x) {
                uint8_t x_dec = apply_enc_inv(enc_in_hi_inv[r][b],
                                              enc_in_lo_inv[r][b], (uint8_t)x);
                uint8_t sbox_in  = (r == 0) ? (x_dec ^ rk[0][b]) : x_dec;
                uint8_t sbox_out = AES_SBOX[sbox_in];
                uint32_t mc_word = tyi_word(b % 4, sbox_out);

                // Absorb rk[r+1] into the row-0 byte of each column
                if (b % 4 == 0) {
                    int j = b / 4;
                    mc_word ^= ((uint32_t)rk[r+1][4*j+0] << 24)
                             | ((uint32_t)rk[r+1][4*j+1] << 16)
                             | ((uint32_t)rk[r+1][4*j+2] <<  8)
                             |  (uint32_t)rk[r+1][4*j+3];
                }

                uint32_t encoded = 0;
                for (int nib = 0; nib < 8; ++nib) {
                    uint8_t raw = (uint8_t)((mc_word >> (28 - 4*nib)) & 0xF);
                    encoded |= ((uint32_t)apply_nibble(tyi_out_nib[r][b][nib], raw) << (28 - 4*nib));
                }
                T.tyi_tab[r][b][x] = encoded;
            }
        }
    }

    // Round 10 T-boxes: reads state[SR_map[i]], encoded with enc_in[9][SR_map[i]]
    for (int i = 0; i < 16; ++i) {
        int src = SR_map[i];
        for (int x = 0; x < 256; ++x) {
            uint8_t x_dec = apply_enc_inv(enc_in_hi_inv[9][src],
                                          enc_in_lo_inv[9][src], (uint8_t)x);
            T.t10_tab[i][x] = AES_SBOX[x_dec] ^ rk[10][i];
        }
    }

    uint8_t plain[32] = {};
    memcpy(plain, cd_key_str, 22);
    aes_ecb_encrypt(key, plain,    T.expected_ct);
    aes_ecb_encrypt(key, plain+16, T.expected_ct+16);
}

// Self-test

static void wb_aes_encrypt_test(const WbTables& T, const uint8_t in[16], uint8_t out[16]) {
    static const int SFC[4][4] = {
        {0,5,10,15}, {4,9,14,3}, {8,13,2,7}, {12,1,6,11}
    };
    uint8_t state[16];
    memcpy(state, in, 16);

    for (int r = 0; r < 9; ++r) {
        uint8_t next[16] = {};
        for (int j = 0; j < 4; ++j) {
            uint32_t W[4];
            for (int k = 0; k < 4; ++k)
                W[k] = T.tyi_tab[r][SFC[j][k]][state[SFC[j][k]]];

            uint8_t ab[8], cd[8], fin[8];
            for (int p = 0; p < 8; ++p) {
                uint8_t nA = (W[0] >> (28-4*p)) & 0xF, nB = (W[1] >> (28-4*p)) & 0xF;
                uint8_t nC = (W[2] >> (28-4*p)) & 0xF, nD = (W[3] >> (28-4*p)) & 0xF;
                ab[p]  = T.xor_tab[r][j][0][p][nA][nB];
                cd[p]  = T.xor_tab[r][j][1][p][nC][nD];
                fin[p] = T.xor_tab[r][j][2][p][ab[p]][cd[p]];
            }
            for (int k = 0; k < 4; ++k)
                next[4*j+k] = (uint8_t)((fin[2*k] << 4) | fin[2*k+1]);
        }
        memcpy(state, next, 16);
    }
    for (int i = 0; i < 16; ++i)
        out[i] = T.t10_tab[i][state[SR_map[i]]];
}

static void self_test(const uint8_t key[16], const WbTables& T) {
    // FIPS-197 Appendix B
    static const uint8_t fips_pt[16] = {
        0x32,0x43,0xf6,0xa8,0x88,0x5a,0x30,0x8d,
        0x31,0x31,0x98,0xa2,0xe0,0x37,0x07,0x34
    };
    static const uint8_t known_pt[16] = {
        0x00,0x11,0x22,0x33,0x44,0x55,0x66,0x77,
        0x88,0x99,0xaa,0xbb,0xcc,0xdd,0xee,0xff
    };

    const uint8_t* vecs[] = { fips_pt, known_pt };
    const char*    names[] = { "FIPS-B", "key-specific" };

    for (int v = 0; v < 2; ++v) {
        uint8_t ref[16], wb[16];
        aes_ecb_encrypt(key, vecs[v], ref);
        wb_aes_encrypt_test(T, vecs[v], wb);
        bool ok = memcmp(ref, wb, 16) == 0;
        fprintf(stderr, "[wbgen] self-test %-14s %s\n", names[v], ok ? "PASS" : "FAIL");
        if (!ok) {
            fprintf(stderr, "  ref: "); for (int i=0;i<16;++i) fprintf(stderr,"%02x",ref[i]);
            fprintf(stderr, "\n  wb:  "); for (int i=0;i<16;++i) fprintf(stderr,"%02x",wb[i]);
            fprintf(stderr, "\n");
            exit(1);
        }
    }
}

// Header emitter

static void emit_header(const WbTables& T, const char* filename) {
    FILE* f = fopen(filename, "w");
    if (!f) { perror("fopen"); exit(1); }

    fprintf(f,
        "// AUTO-GENERATED by wbgen -- DO NOT EDIT\n"
        "#pragma once\n"
        "#include <cstdint>\n\n");

    fprintf(f, "static const uint32_t tyi_tab[9][16][256] = {\n");
    for (int r = 0; r < 9; ++r) {
        fprintf(f, "  {\n");
        for (int b = 0; b < 16; ++b) {
            fprintf(f, "    {");
            for (int x = 0; x < 256; ++x) {
                if (x % 8 == 0) fprintf(f, "\n      ");
                fprintf(f, "0x%08x", T.tyi_tab[r][b][x]);
                if (x < 255) fprintf(f, ",");
            }
            fprintf(f, "\n    }%s\n", b < 15 ? "," : "");
        }
        fprintf(f, "  }%s\n", r < 8 ? "," : "");
    }
    fprintf(f, "};\n\n");

    fprintf(f, "static const uint8_t xor_tab[9][4][3][8][16][16] = {\n");
    for (int r = 0; r < 9; ++r) {
        fprintf(f, "  {\n");
        for (int j = 0; j < 4; ++j) {
            fprintf(f, "    {\n");
            for (int lv = 0; lv < 3; ++lv) {
                fprintf(f, "      {\n");
                for (int nib = 0; nib < 8; ++nib) {
                    fprintf(f, "        {\n");
                    for (int a = 0; a < 16; ++a) {
                        fprintf(f, "          {");
                        for (int b = 0; b < 16; ++b) {
                            fprintf(f, "0x%02x", T.xor_tab[r][j][lv][nib][a][b]);
                            if (b < 15) fprintf(f, ",");
                        }
                        fprintf(f, "}%s\n", a < 15 ? "," : "");
                    }
                    fprintf(f, "        }%s\n", nib < 7 ? "," : "");
                }
                fprintf(f, "      }%s\n", lv < 2 ? "," : "");
            }
            fprintf(f, "    }%s\n", j < 3 ? "," : "");
        }
        fprintf(f, "  }%s\n", r < 8 ? "," : "");
    }
    fprintf(f, "};\n\n");

    fprintf(f, "static const uint8_t t10_tab[16][256] = {\n");
    for (int i = 0; i < 16; ++i) {
        fprintf(f, "  {");
        for (int x = 0; x < 256; ++x) {
            if (x % 16 == 0) fprintf(f, "\n    ");
            fprintf(f, "0x%02x", T.t10_tab[i][x]);
            if (x < 255) fprintf(f, ",");
        }
        fprintf(f, "\n  }%s\n", i < 15 ? "," : "");
    }
    fprintf(f, "};\n\n");

    fprintf(f, "static const uint8_t expected_ct[32] = {\n  ");
    for (int i = 0; i < 32; ++i) {
        fprintf(f, "0x%02x", T.expected_ct[i]);
        if (i < 31) fprintf(f, ",");
        if (i == 15) fprintf(f, "\n  ");
    }
    fprintf(f, "\n};\n");

    fclose(f);
    fprintf(stderr, "[wbgen] wrote %s\n", filename);
}

// main

static void usage(const char* prog) {
    fprintf(stderr,
        "Usage: %s <key_hex_32chars> \"DAFT-XXXXX-XXXXX-XXXXX\" [output_path]\n",
        prog);
    exit(1);
}

int main(int argc, char** argv) {
    if (argc < 3) usage(argv[0]);

    const char* hex = argv[1];
    if (strlen(hex) != 32) { fprintf(stderr, "key must be 32 hex chars\n"); usage(argv[0]); }

    uint8_t key[16];
    for (int i = 0; i < 16; ++i) {
        unsigned v;
        if (sscanf(hex + 2*i, "%02x", &v) != 1) {
            fprintf(stderr, "invalid hex at position %d\n", 2*i); return 1;
        }
        key[i] = (uint8_t)v;
    }

    const char* cd_key = argv[2];
    if (strlen(cd_key) != 22) {
        fprintf(stderr, "CD key must be exactly 22 chars\n"); usage(argv[0]);
    }

    fprintf(stderr, "[wbgen] key:    "); for (int i=0;i<16;++i) fprintf(stderr,"%02x",key[i]);
    fprintf(stderr, "\n[wbgen] cd_key: %s\n", cd_key);

    build_sbox();
    assert(AES_SBOX[0x53] == 0xed);
    {
        static const uint8_t tk[16] = {
            0x2b,0x7e,0x15,0x16,0x28,0xae,0xd2,0xa6,
            0xab,0xf7,0x15,0x88,0x09,0xcf,0x4f,0x3c
        };
        uint8_t trk[11][16];
        aes_key_schedule(tk, trk);
        assert(trk[1][0]==0xa0 && trk[1][1]==0xfa && trk[1][2]==0xfe && trk[1][3]==0x17);
    }

    WbTables* tables = new WbTables();
    memset(tables, 0, sizeof(WbTables));
    generate_wb_tables(key, (const uint8_t*)cd_key, *tables);

    self_test(key, *tables);

    {
        uint8_t plain[32] = {}, wb_ct[32];
        memcpy(plain, cd_key, 22);
        wb_aes_encrypt_test(*tables, plain,    wb_ct);
        wb_aes_encrypt_test(*tables, plain+16, wb_ct+16);
        if (memcmp(wb_ct, tables->expected_ct, 32) != 0) {
            fprintf(stderr, "[wbgen] FAIL: CD key ciphertext mismatch\n");
            delete tables; return 1;
        }
        fprintf(stderr, "[wbgen] CD key validation: PASS\n");
    }

    const char* out_path = (argc >= 4) ? argv[3] : "DaftClubDRM/wb_tables.h";
    emit_header(*tables, out_path);

    delete tables;
    return 0;
}
