#!/usr/bin/env sage
import json
import hashlib
# import tqdm
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad

N = 50
Q = 1017194805530087781866367482651


SAMPLES_NEEDED = 52

def find_sovereign_pulse_and_bcast_sample(data):
    "Trouve une séquence d'au moins SAMPLE_NEEDED broadcast, et un sovereign_pulse partageant le même secret" 
    samples = []

    cur_sovereign_pulse = None 
    for d in data:
        if 'sovereign_pulse' in d:
            if d['sovereign_pulse'] != cur_sovereign_pulse: 
                cur_sovereign_pulse = d['sovereign_pulse'] 
                samples = []
            continue 
        
        samples.append(d['broadcast']) 

        if len(samples) > SAMPLES_NEEDED: 
            break 

    
    return cur_sovereign_pulse, samples

def solve():
    with open("sniffed.json", "r") as f:
        data = json.load(f)

    
    enc_flag_hex, samples = find_sovereign_pulse_and_bcast_sample(data)
    
    m = len(samples)
    print(f"{Q=} (~ 2^{Q.bit_length()}) {N=}, {m} échantillons ")

    A_list = [s['A'] for s in samples]
    b_list = [s['b'] for s in samples]

    # --- CONSTRUCTION DU RÉSEAU (Primal Embedding) ---
    # On cherche le vecteur secret s (binaire) et le vecteur erreur e (petit).
    # L'équation est : A*s + e = b (mod Q)
    # Donc : A*s + e - b = k*Q
    #
    # On forme la matrice bloc M :
    # [ Q * I_m    0      0 ]
    # [ A_transp   I_N    0 ]
    # [ -b_transp  0      1 ]
    #
    # Le réseau contient le vecteur : v = (kQ + As - b, s, 1) = (e, s, 1)
    # Comme Q est très grand, ce vecteur (e, s, 1) est petit. Les autres vecteurs du réseau sont de l'ordre de Q
    # LLL va trouver.

    print("Construction de la matrice du réseau")
    
    # 1. Bloc Q * I_m (m x m) | 0... | 0
    # Taille totale ligne : m + N + 1
    M_top = (Q * identity_matrix(ZZ, m)).augment(matrix(ZZ, m, N + 1))
    
    # 2. Bloc A^T (N x m) | I_N (N x N) | 0 (N x 1)
    # Attention, A dans les données est m x N (liste de lignes).
    A_mat = matrix(ZZ, A_list).transpose() 
    M_mid = A_mat.augment(identity_matrix(ZZ, N)).augment(matrix(ZZ, N, 1))
    
    # 3. Bloc -b (1 x m) | 0 (1 x N) | 1 (1 x 1)
    b_vec = matrix(ZZ, 1, m, [-x for x in b_list])
    M_bot = b_vec.augment(matrix(ZZ, 1, N)).augment(matrix(ZZ, 1, 1, [1]))
    
    # Empilement
    M = M_top.stack(M_mid).stack(M_bot)
    
    print(f"LLL sur matrice {M.nrows()}x{M.ncols()}")
    L = M.LLL()
    
    print("LLL fini")

    real_s = None
    
    for row in L:
        vec = list(row)
        # Le dernier élément contient le 1 ou le -1 de la matrice augmentée
        
        if abs(vec[-1]) == 1:
            # On normalise le signe pour avoir 1 à la fin
            sign = 1 if vec[-1] == 1 else -1
            vec = [x * sign for x in vec]
            
            # Le vecteur ressemble à : [e_1...e_m, s_1...s_N, 1]
            potentiel_s = vec[m : m+N]
            
            # Vérification : s doit être binaire
            if all(x in [0, 1] for x in potentiel_s):
                print("Solution trouvée")
                real_s = potentiel_s
                break
    
    if real_s:
        print(f"FLAG = {decrypt_flag(real_s, enc_flag_hex)}")
    else:
        print("Echec. Recollectez des données")

def decrypt_flag(s_vec, enc_hex):
    # Reconstruction de la clé AES comme le serveur
    s_string = "".join(str(x) for x in s_vec)
    aes_key = hashlib.sha256(s_string.encode()).digest()
    
    cipher = AES.new(aes_key, AES.MODE_ECB)
    enc_bytes = bytes.fromhex(enc_hex)
    return unpad(cipher.decrypt(enc_bytes), 16)
    

if __name__ == "__main__":
    solve()