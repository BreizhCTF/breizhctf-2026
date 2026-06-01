import json
import os

from Crypto.PublicKey import RSA
from Crypto.Util.number import bytes_to_long
from flask import Flask, jsonify, render_template, request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)

# --- Load Server Configuration ---
with open("server_config.json", "r") as f:
    config = json.load(f)

# Load Private Key & Public Admin Ciphertext
key = RSA.import_key(config["private_key"])
N = key.n
E = key.e
D = key.d
C_ADMIN = int(config["c_admin"])

# Flag can be an environment variable or a constant
FLAG = os.environ.get("FLAG", "BZHCTF{FAKE_FLAG}")

# --- Routes ---


@app.route("/")
def index():
    return render_template("index.html", n=N, e=E)


@app.route("/api/verify", methods=["POST"])
def verify():
    data = request.get_json()
    if not data or "ticket" not in data:
        return jsonify({"error": "Requête invalide"}), 400
    try:
        # Hex input
        ticket_hex = data["ticket"].strip()
        if ticket_hex.startswith("0x"):
            ticket_hex = ticket_hex[2:]
        c = int(ticket_hex, 16)
    except ValueError:
        return jsonify({"error": "Ticket invalide (Hex attendu)"}), 400

    m = pow(c, D, N)
    is_babord = m & 1

    return jsonify(
        {"status": "success", "side": "Bâbord" if is_babord == 0 else "Tribord"}
    )


@app.route("/login", methods=["POST"])
def login():
    """
    Verifies if (input_password^E mod N) == C_ADMIN.
    """
    password = request.form.get("password", "").encode()
    if not password:
        return "Veuillez saisir un code.", 400

    # Mathematical verification
    m_input = bytes_to_long(password)
    c_input = pow(m_input, E, N)

    if c_input == C_ADMIN:
        return render_template("admin.html", flag=FLAG)
    else:
        return "Accès refusé. Code de sécurité invalide.", 401


if __name__ == "__main__":
    app.run(
        debug=bool(os.environ.get("DEBUG", False)),
        threaded=False,
        use_reloader=True,
        host="0.0.0.0",
    )
