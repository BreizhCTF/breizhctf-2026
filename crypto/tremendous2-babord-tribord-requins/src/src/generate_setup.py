import json
import secrets
import string
from Crypto.PublicKey import RSA
from Crypto.Util.number import bytes_to_long

# --- Configuration ---
KEY_SIZE = 1024
# Generate a random 16-character password for each setup
RANDOM_PASS = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))

def generate():
    print("[*] Création d'une nouvelle instance du Golden Caviar Yacht Club...")
    
    # 1. Génération RSA
    key = RSA.generate(KEY_SIZE)
    n, e, d = key.n, key.e, key.d
    
    # 2. Chiffrement du secret aléatoire
    m_secret = bytes_to_long(RANDOM_PASS.encode())
    c_admin = pow(m_secret, e, n)

    # 3. Sauvegarde de la configuration SECRÈTE (pour le serveur)
    server_config = {
        "private_key": key.export_key().decode(),
        "c_admin": str(c_admin)
    }
    with open("server_config.json", "w") as f:
        json.dump(server_config, f, indent=4)
    print("[+] Configuration serveur sauvegardée dans 'server_config.json'")

    # 4. Sauvegarde des données INTERCEPTÉES (pour le challenger)
    intercepted_data = {
        "description": "Interception du trafic réseau - Golden Caviar Yacht Club",
        "target": "Session de l'Amiral d'Or",
        "public_parameters": {
            "n": str(n),
            "e": e
        },
        "intercepted_cookie": {
            "name": "vault_access_ticket",
            "value": hex(c_admin),
            "comment": "Ticket DRM de session intercepté (Hex)"
        }
    }
    with open("intercepted_data.json", "w") as f:
        json.dump(intercepted_data, f, indent=4)
    
    print("[+] Données d'interception générées dans 'intercepted_data.json'")
    print(f"[!] Mot de passe généré (pour info admin) : {RANDOM_PASS}")
    print("[!] Rappel : Seul 'intercepted_data.json' doit être transmis aux challengers.")

if __name__ == "__main__":
    generate()
