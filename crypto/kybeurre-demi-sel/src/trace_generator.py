import json
import random 
import hashlib
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad  
from Crypto.Util.number import getPrime, isPrime
import tqdm


PARAM_N = 50
# PARAM_Q_BITS = 100
Q = 1017194805530087781866367482651
MAX_CYCLES = 100

MAX_SAMPLES = 1000
ADMIN_TOKEN = b"BZHCTF{adding_too_much_salt_in_the_modulus_cracks_the_algorithm}"
assert len(ADMIN_TOKEN) == 64, 'Wrong admin token len'



sys_ctx = {}
sys_ctx['secret_vector'] = [random.randint(0, 1) for _ in range(PARAM_N)]
sys_ctx['cycle_counter'] = random.randint(0, MAX_CYCLES)


def _refresh_secret():
    sys_ctx['secret_vector'] = [random.randint(0, 1) for _ in range(PARAM_N)]
    sys_ctx['cycle_counter'] = 0

def _get_noise():
    return random.randint(-10, 10)

def generate_beacon():
    if sys_ctx['cycle_counter'] >= MAX_CYCLES:
        _refresh_secret()
    
    sys_ctx['cycle_counter'] += 1
    
    vec_a = [random.randint(0, Q-1) for _ in range(PARAM_N)]
    
    dot_prod = sum(a * s for a, s in zip(vec_a, sys_ctx['secret_vector']))
    val_b = (dot_prod + _get_noise()) % Q

    return {'A': vec_a, 'b': val_b}


def _derive_aes_key(secret_vector):
    sv_str = "".join(str(x) for x in secret_vector)
    return hashlib.sha256(sv_str.encode()).digest()

def generate_sovereign_pulse():
    key = _derive_aes_key(sys_ctx['secret_vector'])
    cipher = AES.new(key, AES.MODE_ECB) 

    encrypted_token = cipher.encrypt(pad(ADMIN_TOKEN, 16))

    return encrypted_token.hex()



if __name__ == "__main__":

    trace = []
    nb_samples = 0
    for i in tqdm.tqdm(range(MAX_SAMPLES)):
        trace.append({'broadcast': generate_beacon()})
        if random.randint(0, 10) == 4:
            trace.append({'sovereign_pulse' : generate_sovereign_pulse()})

    
    with open('sniffed.json', 'w') as f: 
        s = json.dumps(trace)
        f.write(s)