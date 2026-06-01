import os
import secrets
from datetime import datetime

from dotenv import load_dotenv
from flask import Flask, Response, session
from flask_sock import Sock
from gevent import monkey
from werkzeug.security import generate_password_hash

from admin_routes import admin_bp
from user_routes import user_bp

monkey.patch_all()

load_dotenv()

if os.path.isfile("/secret_key.txt"):
    with open("/secret_key.txt", "r") as f:
        secret_key = f.read().strip()
else:
    secret_key = secrets.token_hex(16)


class App(Flask):
    users: dict[str, dict[str, str | datetime]]
    messages: list[dict[str, str]]
    ws_clients: dict[str, set]
    file_permissions: dict[str, list[str]]


app = App(__name__)
sock = Sock(app)
app.secret_key = secret_key
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024
app.config["SESSION_COOKIE_SAMESITE"] = "Strict"

app.users = {
    "admin": {
        "password": generate_password_hash(secrets.token_hex(32)),
        "last_seen": datetime.now(),
    },
}
app.messages = []
app.ws_clients = {}
app.file_permissions = {}


@app.after_request
def add_security_headers(response: Response):
    csp = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline' *; "
        "font-src 'self' *; "
        "img-src 'self' data:; "
        "connect-src 'self';"
        "frame-src *;"
    )
    response.headers["Content-Security-Policy"] = csp

    return response


app.register_blueprint(user_bp)
app.register_blueprint(admin_bp)

os.makedirs("uploads", exist_ok=True)


@sock.route("/ws")
def websocket(ws):
    if "user" not in session:
        ws.close()
        return

    username = session["user"]
    if username not in app.ws_clients:
        app.ws_clients[username] = set()
    app.ws_clients[username].add(ws)

    try:
        while True:
            ws.receive()
    except:  # pylint: disable=bare-except
        pass
    finally:
        if username in app.ws_clients:
            app.ws_clients[username].discard(ws)
            if not app.ws_clients[username]:
                del app.ws_clients[username]


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
