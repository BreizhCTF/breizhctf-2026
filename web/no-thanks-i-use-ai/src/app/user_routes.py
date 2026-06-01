import base64
import json
import mimetypes
import os
import threading
import time
from datetime import datetime
from functools import wraps
from typing import TYPE_CHECKING

from flask import Blueprint, jsonify, render_template, send_from_directory, url_for, request, session, current_app as _current_app
from werkzeug.security import check_password_hash, generate_password_hash

if TYPE_CHECKING:
    from app import App
    current_app: App = _current_app  # type: ignore[assignment]
else:
    current_app = _current_app


def send_websocket_message(username: str, message: dict):
    if username in current_app.ws_clients:
        for client in current_app.ws_clients[username].copy():
            try:
                client.send(json.dumps(message))
            except: # pylint: disable=bare-except
                pass


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user" not in session:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)

    return decorated_function


user_bp = Blueprint("user", __name__)


def welcome_worker(messages, ws_clients, username: str):
    time.sleep(3)
    welcome_msg = (
       f"Salut {username}, bienvenue sur Pyro Chat ! 🔥\n\n"
        "Profitez d'une expérience moderne et fluide :\n"
        "✨ Messagerie instantanée\n"
        "🔍 Recherche d'utilisateurs rapide\n"
        "📎 Partage d'images et de fichiers\n"
        "🔗 Prévisualisation des liens (ex: https://example.com)\n\n"
        "Si vous avez besoin d'aide, contactez moi.\n"
        "Je passe lire mes messages régulièrement ! 😉"
    )
    message = {
        "from": "admin",
        "to": username,
        "content": welcome_msg,
        "attachment": {
            "url": "/uploads/welcome.txt",
            "type": "file",
            "name": "welcome.txt",
        },
        "timestamp": datetime.now().isoformat(),
    }

    messages.append(message)
    if username in ws_clients:
        for client in ws_clients[username].copy():
            try:
                client.send(json.dumps(message))
            except: # pylint: disable=bare-except
                pass


@user_bp.route("/")
def index():
    if "user" not in session:
        return render_template("login.html")
    return render_template("chat.html", user=session["user"])


@user_bp.route("/api/register", methods=["POST"])
def register():
    data = request.json or {}
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    if username in current_app.users:
        return jsonify({"error": "Username already taken"}), 400

    current_app.users[username] = {
        "password": generate_password_hash(password),
        "last_seen": datetime.now(),
    }

    threading.Thread(
        target=welcome_worker,
        args=(current_app.messages, current_app.ws_clients, username),
        daemon=True,
    ).start()

    session["user"] = username
    return jsonify({"status": "success", "user": username})


@user_bp.route("/api/login", methods=["POST"])
def login():
    data = request.json or {}
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    user = current_app.users.get(username)
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    session["user"] = username
    return jsonify({"status": "success", "user": username})


@user_bp.route("/api/logout", methods=["POST"])
def logout():
    session.pop("user", None)
    return jsonify({"status": "success"})


@user_bp.route("/api/users/search")
@login_required
def search_users():
    query = request.args.get("q", "").lower()
    current_user = session["user"]

    matched_users = [
        u for u in current_app.users if u.lower().startswith(query) and u != current_user
    ]
    matched_users.sort()
    return jsonify(matched_users[:10])


@user_bp.route("/api/conversations")
@login_required
def get_conversations():
    current_user = session["user"]
    partners = set()
    for msg in current_app.messages:
        if msg["from"] == current_user:
            partners.add(msg["to"])
        elif msg["to"] == current_user:
            partners.add(msg["from"])

    return jsonify(sorted(list(partners)))


@user_bp.route("/api/messages/<partner>", methods=["GET"])
@login_required
def get_messages(partner: str):
    current_user = session["user"]

    conversation = [
        msg
        for msg in current_app.messages
        if (msg["from"] == current_user and msg["to"] == partner)
        or (msg["from"] == partner and msg["to"] == current_user)
    ]

    return jsonify(conversation)


@user_bp.route("/api/send_message", methods=["POST"])
@login_required
def send_message():
    data = request.json
    recipient = data.get("to")
    content = data.get("content", "")
    attachment = data.get("attachment")
    if not recipient or (not content and not attachment):
        return jsonify({"error": "Missing data"}), 400

    message = {
        "from": session["user"],
        "to": recipient,
        "content": content,
        "attachment": attachment,
        "timestamp": datetime.now().isoformat(),
    }

    current_app.messages.append(message)

    send_websocket_message(session["user"], message)
    send_websocket_message(recipient, message)

    return jsonify(message)


@user_bp.route("/uploads/<filename>")
@login_required
def uploaded_file(filename: str):
    if filename in current_app.file_permissions:
        if session["user"] not in current_app.file_permissions[filename]:
            return jsonify({"error": "Forbidden"}), 403

    mimetype = mimetypes.guess_type(filename)[0]
    if not mimetype or not mimetype.startswith("image/"):
        mimetype = "application/octet-stream"
    response = send_from_directory("uploads", filename, mimetype=mimetype)
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@user_bp.route("/api/upload", methods=["POST"])
@login_required
def upload_file():
    data = request.json
    if not data:
        return jsonify({"error": "No json part"}), 400

    filename = data.get("filename")
    b64_content = data.get("content")
    allowed_users = data.get("allowed_users")

    if not filename or not b64_content:
        return jsonify({"error": "Missing filename or content"}), 400

    if not filename:
        return jsonify({"error": "Invalid filename"}), 400

    if any(s in filename for s in ("/", "\\", "..", "~")):
        return jsonify({"error": "Invalid filename"}), 400

    try:
        if "," in b64_content:
            b64_content = b64_content.split(",", 1)[1]
        file_content = base64.b64decode(b64_content)
        file_path = os.path.abspath(f"uploads/{filename}")
        with open(file_path, "wb") as f:
            f.write(file_content)

        if allowed_users:
            current_app.file_permissions[filename] = allowed_users

        url = url_for("user.uploaded_file", filename=filename)
        mimetype = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        return jsonify({"url": url, "mimetype": mimetype})

    except Exception as e: # pylint: disable=broad-except
        print(e)
        return jsonify({"error": "Upload failed"}), 500
