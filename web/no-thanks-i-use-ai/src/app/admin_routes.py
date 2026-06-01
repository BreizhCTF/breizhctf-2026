import os
import shutil
from functools import wraps
from typing import TYPE_CHECKING

from flask import Blueprint, jsonify, render_template, request, session, current_app as _current_app

if TYPE_CHECKING:
    from app import App
    current_app: App = _current_app
else:
    current_app = _current_app


def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user" not in session:
            return jsonify({"error": "Unauthorized"}), 401
        if session["user"] != "admin":
            return jsonify({"error": "Forbidden"}), 403
        return f(*args, **kwargs)

    return decorated_function

def get_uploads():
    uploads = []
    for filename in os.listdir("uploads"):
        file_path = os.path.join("uploads", filename)
        if os.path.isfile(file_path) and filename != "welcome.txt":
            uploads.append(filename)
    return uploads


admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/admin")
@admin_required
def admin_panel():
    return render_template("admin.html")


@admin_bp.route("/api/admin/files", methods=["GET"])
@admin_required
def list_files():
    return jsonify(get_uploads())


@admin_bp.route("/api/admin/files/delete", methods=["POST"])
@admin_required
def delete_file():
    data = request.json or {}
    filename = data.get("filename")

    if filename not in get_uploads():
        return jsonify({"error": "File not found"}), 404

    file_path = os.path.abspath(f"uploads/{filename}")

    os.remove(file_path)
    current_app.file_permissions.pop(filename, None)

    return jsonify({"status": "success"})


@admin_bp.route("/api/admin/files/move", methods=["POST"])
@admin_required
def move_file():
    data = request.json or {}
    filename = data.get("filename")
    new_filename = data.get("newFilename")

    if filename not in get_uploads():
        return jsonify({"error": "File not found"}), 404

    if not new_filename:
        return jsonify({"error": "Missing new_filename"}), 400

    src_path = os.path.abspath(f"uploads/{filename}")
    dst_path = os.path.abspath(f"uploads/{new_filename}")

    while os.path.exists(dst_path):
        root, ext = os.path.splitext(dst_path)

        spl = root.rsplit("_", 1)
        if len(spl) == 2 and spl[1].isdigit():
            base = spl[0]
            num = int(spl[1]) + 1
        else:
            base = root
            num = 1
        dst_path = f"{base}_{num}{ext}"

    shutil.move(src_path, dst_path)

    if filename in current_app.file_permissions:
        current_app.file_permissions[new_filename] = current_app.file_permissions.pop(filename)

    return jsonify({"status": "success", "new_filename": os.path.basename(dst_path)})
