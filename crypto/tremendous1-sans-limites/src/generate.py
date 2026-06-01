import os
import secrets
import sys
from Crypto.Util.number import bytes_to_long, getPrime

sys.set_int_max_str_digits(0)

FLAG = os.getenv('FLAG', "BZHCTF{FAKE_FLAG}").encode()

def generate_polynomial(secret_int, threshold):
    """
    Génère un polynôme de degré (threshold - 1).
    Les coefficients sont choisis sur 512 bits.
    """
    coefficients = [secret_int]
    for _ in range(threshold - 1):
        coefficients.append(secrets.randbits(512))
    return coefficients

def evaluate_polynomial(poly, x):
    """
    Évalue le polynôme P(x) = a0 + a1*x + a2*x^2 + ... + an*x^n
    """
    result = 0
    for i, coeff in enumerate(poly):
        result += coeff * (x ** i)
    return result

def main():
    threshold = 100
    
    x = getPrime(1024)
    
    secret_int = bytes_to_long(FLAG)
    poly = generate_polynomial(secret_int, threshold)
    
    y = evaluate_polynomial(poly, x)
    
    with open("leak.txt", "w") as f:
        f.write(f"x: {x}\n")
        f.write(f"y: {y}\n")
            

if __name__ == "__main__":
    main()
