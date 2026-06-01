#!/usr/bin/env python3
"""BzhMessenger - BreizhCTF 2026"""

import hashlib
import hmac
import json
import os
import sqlite3
import time
import uuid
import base64

from flask import Flask, request, jsonify, render_template, send_from_directory
from werkzeug.utils import secure_filename

from seed import USERS, CHANNELS, seed_messages, start_ambient_chat

app = Flask(__name__)

SECRET_KEY = "bzh_2026_1sw34r_s3cr3t"
_BASE_DIR = os.environ.get("APP_DIR", os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(_BASE_DIR, "uploads")
DB_PATH = os.path.join(_BASE_DIR, "data", "messages.db")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)


# ==================== DATABASE ====================

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            channel_id TEXT NOT NULL,
            username TEXT NOT NULL,
            content TEXT NOT NULL,
            attachment_hash TEXT,
            attachment_name TEXT,
            created_at REAL NOT NULL
        );
        CREATE TABLE IF NOT EXISTS attachments (
            hash TEXT PRIMARY KEY,
            original_name TEXT NOT NULL,
            mime_type TEXT,
            size INTEGER,
            created_at REAL NOT NULL
        );
    """)
    cur = conn.execute("SELECT COUNT(*) FROM messages")
    if cur.fetchone()[0] == 0:
        seed_messages(conn, UPLOAD_DIR)
    conn.commit()
    conn.close()


# ==================== AUTH ====================

def create_token(username):
    header = base64.b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode()
    payload = base64.b64encode(json.dumps({
        "sub": username,
        "iat": int(time.time()),
        "exp": int(time.time()) + 86400,
    }).encode()).decode()
    signature = hmac.new(SECRET_KEY.encode(), f"{header}.{payload}".encode(), hashlib.sha256).hexdigest()
    return f"{header}.{payload}.{signature}"


def verify_token(token):
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header, payload, signature = parts
        expected = hmac.new(SECRET_KEY.encode(), f"{header}.{payload}".encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            return None
        data = json.loads(base64.b64decode(payload))
        if data.get("exp", 0) < time.time():
            return None
        return data
    except Exception:
        return None


def get_user_from_request():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    return verify_token(auth[7:])


# ==================== API ROUTES ====================

@app.route("/api/auth/login", methods=["POST"])
def login():
    body = request.get_json(silent=True) or {}
    username = body.get("username", "")
    password = body.get("password", "")

    user = USERS.get(username)
    if not user or not user.get("password") or user["password"] != password:
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_token(username)
    return jsonify({
        "token": token,
        "user": {"username": username, "avatar": user["avatar"], "color": user["color"]},
    })


@app.route("/api/channels", methods=["GET"])
def list_channels():
    user = get_user_from_request()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({"channels": CHANNELS})


@app.route("/api/channels/<channel_id>/messages", methods=["GET"])
def get_messages(channel_id):
    user = get_user_from_request()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM (SELECT * FROM messages WHERE channel_id = ? ORDER BY created_at DESC LIMIT 100) ORDER BY created_at ASC",
        (channel_id,),
    ).fetchall()
    conn.close()

    messages = []
    for row in rows:
        msg = {
            "id": row["id"],
            "username": row["username"],
            "content": row["content"],
            "created_at": row["created_at"],
        }
        if row["attachment_hash"]:
            msg["attachment"] = {
                "hash": row["attachment_hash"],
                "name": row["attachment_name"],
                "url": f"/uploads/{row['attachment_hash']}",
            }
        messages.append(msg)

    return jsonify({"messages": messages})


@app.route("/api/channels/<channel_id>/messages", methods=["POST"])
def send_message(channel_id):
    user = get_user_from_request()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    body = request.get_json(silent=True) or {}
    content = body.get("content", "").strip()
    attachment_hash = body.get("attachment_hash")
    attachment_name = body.get("attachment_name")

    if not content and not attachment_hash:
        return jsonify({"error": "Empty message"}), 400

    msg_id = str(uuid.uuid4())
    conn = get_db()
    conn.execute(
        "INSERT INTO messages (id, channel_id, username, content, attachment_hash, attachment_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (msg_id, channel_id, user["sub"], content, attachment_hash, attachment_name, time.time()),
    )
    conn.commit()
    conn.close()

    return jsonify({"id": msg_id, "status": "sent"})


@app.route("/api/channels/<channel_id>/messages/<message_id>", methods=["DELETE"])
def delete_message(channel_id, message_id):
    user = get_user_from_request()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    row = conn.execute(
        "SELECT username FROM messages WHERE id = ? AND channel_id = ?",
        (message_id, channel_id),
    ).fetchone()

    if not row:
        conn.close()
        return jsonify({"error": "Message not found"}), 404

    if row[0] != user["sub"]:
        conn.close()
        return jsonify({"error": "You can only delete your own messages"}), 403

    conn.execute("DELETE FROM messages WHERE id = ?", (message_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "deleted"})


@app.route("/api/upload", methods=["POST"])
def upload_file():
    user = get_user_from_request()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    f = request.files["file"]
    if not f.filename:
        return jsonify({"error": "No filename"}), 400

    original_name = secure_filename(f.filename)
    data = f.read()
    file_hash = hashlib.sha256(data).hexdigest()[:16]

    filepath = os.path.join(UPLOAD_DIR, file_hash)
    with open(filepath, "wb") as out:
        out.write(data)

    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO attachments (hash, original_name, mime_type, size, created_at) VALUES (?, ?, ?, ?, ?)",
        (file_hash, original_name, f.content_type, len(data), time.time()),
    )
    conn.commit()
    conn.close()

    return jsonify({
        "hash": file_hash,
        "original_name": original_name,
        "url": f"/uploads/{file_hash}",
    })


@app.route("/uploads/<file_hash>")
def serve_upload(file_hash):
    conn = get_db()
    row = conn.execute("SELECT mime_type, original_name FROM attachments WHERE hash = ?", (file_hash,)).fetchone()
    conn.close()
    mimetype = row["mime_type"] if row and row["mime_type"] else None
    download_name = row["original_name"] if row else None
    return send_from_directory(UPLOAD_DIR, file_hash, mimetype=mimetype, download_name=download_name)


# ==================== HTML VIEWS ====================

@app.route("/view/channel/<channel_id>")
def view_channel(channel_id):
    auth = request.args.get("token", "")
    user = verify_token(auth)
    if not user:
        return "<h1>Unauthorized</h1>", 401

    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM (SELECT * FROM messages WHERE channel_id = ? ORDER BY created_at DESC LIMIT 100) ORDER BY created_at ASC",
        (channel_id,),
    ).fetchall()
    conn.close()

    messages = []
    for row in rows:
        msg = {
            "username": row["username"],
            "content": row["content"],
            "time_str": time.strftime("%d/%m %H:%M", time.localtime(row["created_at"])),
            "attachment": None,
        }
        if row["attachment_hash"]:
            name = row["attachment_name"] or "file"
            msg["attachment"] = {
                "url": f"/uploads/{row['attachment_hash']}",
                "name": name,
                "is_image": name.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')),
            }
        messages.append(msg)

    return render_template("message_view.html", messages=messages, users=USERS)


@app.route("/")
def web_chat():
    users_safe = {k: {"avatar": v["avatar"], "color": v["color"], "avatar_url": v.get("avatar_url", "")} for k, v in USERS.items()}
    return render_template("web_chat.html", users=users_safe)


# ==================== INIT ====================

init_db()
start_ambient_chat(DB_PATH, UPLOAD_DIR)

if __name__ == "__main__":
    print("[*] BzhMessenger - BreizhCTF 2026")
    print("[*] Player credentials: player / bzhctf2026")
    app.run(host="0.0.0.0", port=80)
