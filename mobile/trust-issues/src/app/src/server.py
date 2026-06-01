#!/usr/bin/env python3
"""Trust Issues - BreizhCTF 2026 Challenge Server"""

import base64
import hashlib
import hmac
import json
import time

from flask import Flask, jsonify, request

app = Flask(__name__)

SECRET_KEY = "br31zhctf_2026_s3cr3t_k3y_tr0ll"
VERIFY_SECRET = bytes.fromhex(
    "8dde6bbc2c5b232ae6cfb4f11278ab64e321fd366fff37abc877b2d48c6ede1d"
)
FLAG = "BZHCTF{4i_&_cl13nt_s1d3_ch3cks_4r3_n0t_s3cur1ty}"
ADMIN_PIN = "83174290"

USERS = {
    "player": {"password": "ctf2026"},
}

CHALLENGES = [
    {"name": "Trust Issues", "category": "Mobile", "points": 200, "solved": False},
    {
        "name": "I swear it's a feature!",
        "category": "Mobile",
        "points": 500,
        "solved": False,
    },
    {
        "name": "(Don't) Bring back Windev",
        "category": "Mobile",
        "points": 350,
        "solved": False,
    },
    {"name": "Breizh Breaker", "category": "Web", "points": 150, "solved": True},
    {"name": "Galette Complète", "category": "Crypto", "points": 250, "solved": False},
    {
        "name": "Kouign-Amann Overflow",
        "category": "Pwn",
        "points": 400,
        "solved": False,
    },
]

# Rate limiting: token -> {attempts: int, locked_until: float}
pin_attempts: dict[str, dict] = {}


def create_token(username: str) -> str:
    header = base64.b64encode(
        json.dumps({"alg": "HS256", "typ": "JWT"}).encode()
    ).decode()
    payload = base64.b64encode(
        json.dumps(
            {
                "sub": username,
                "iat": int(time.time()),
                "exp": int(time.time()) + 3600,
            }
        ).encode()
    ).decode()
    signature = hmac.new(
        SECRET_KEY.encode(), f"{header}.{payload}".encode(), hashlib.sha256
    ).hexdigest()
    return f"{header}.{payload}.{signature}"


def verify_token(token: str) -> dict | None:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header, payload, signature = parts
        expected_sig = hmac.new(
            SECRET_KEY.encode(), f"{header}.{payload}".encode(), hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        data = json.loads(base64.b64decode(payload))
        if data.get("exp", 0) < time.time():
            return None
        return data
    except Exception:
        return None


def get_token_from_request() -> dict | None:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    return verify_token(auth[7:])


@app.route("/login", methods=["POST"])
def login():
    body = request.get_json(silent=True) or {}
    username = body.get("username", "")
    password = body.get("password", "")

    user = USERS.get(username)
    if not user or user["password"] != password:
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_token(username)
    return jsonify(
        {
            "message": f"Welcome {username}!",
            "token": token,
        }
    )


@app.route("/challenges", methods=["GET"])
def challenges():
    token_data = get_token_from_request()
    if not token_data:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({"challenges": CHALLENGES})


@app.route("/admin/verify-pin", methods=["POST"])
def verify_pin():
    token_data = get_token_from_request()
    if not token_data:
        return jsonify({"error": "Unauthorized"}), 401

    user = token_data["sub"]

    # Rate limiting
    if user in pin_attempts:
        info = pin_attempts[user]
        if info.get("locked_until", 0) > time.time():
            remaining = int(info["locked_until"] - time.time())
            return jsonify(
                {
                    "success": False,
                    "error": f"Too many attempts. Try again in {remaining}s",
                }
            ), 429
        if info["attempts"] >= 3:
            pin_attempts[user] = {"attempts": 0, "locked_until": time.time() + 60}
            return jsonify(
                {
                    "success": False,
                    "error": "Too many attempts. Locked for 60s",
                }
            ), 429

    body = request.get_json(silent=True) or {}
    pin = body.get("pin", "")

    if pin == ADMIN_PIN:
        pin_attempts.pop(user, None)
        return jsonify({"success": True})
    else:
        if user not in pin_attempts:
            pin_attempts[user] = {"attempts": 0, "locked_until": 0}
        pin_attempts[user]["attempts"] += 1
        remaining = 3 - pin_attempts[user]["attempts"]
        return jsonify(
            {
                "success": False,
                "error": f"Wrong PIN. {remaining} attempts remaining",
            }
        ), 403


@app.route("/admin/flag", methods=["GET"])
def admin_flag():
    """
    This endpoint checks:
    1. Valid JWT token
    2. X-Verify-Token header = HMAC-SHA256(VERIFY_SECRET, token + ":/admin/flag")

    The HMAC key (VERIFY_SECRET) is embedded in the APK. The client only
    sends this header when PinManager.isVerified() is true.
    Frida users hook PinManager → the app computes and sends the HMAC automatically.
    curl users must reverse-engineer the APK to find the key and reimplement the HMAC.
    """
    token_data = get_token_from_request()
    if not token_data:
        return jsonify({"error": "Unauthorized"}), 401

    auth = request.headers.get("Authorization", "")
    token = auth[7:]  # strip "Bearer "

    verify_token = request.headers.get("X-Verify-Token", "")
    expected = hmac.new(
        VERIFY_SECRET,
        f"{token}:/admin/flag".encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(verify_token, expected):
        return jsonify({"error": "Invalid verify token"}), 403

    return jsonify({"flag": FLAG})


if __name__ == "__main__":
    print("[*] Trust Issues - BreizhCTF 2026 Challenge Server")
    print("[*] Running on http://0.0.0.0:80")
    print("[*] Player credentials: player / ctf2026")
    app.run(host="0.0.0.0", port=80)
