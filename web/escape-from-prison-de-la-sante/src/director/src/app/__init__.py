from flask import Flask, request, abort
from .config import Config
from .routes import register_routes


def create_app():
    app = Flask(__name__, template_folder='../templates')
    app.config.from_object(Config)
    register_routes(app)

    @app.before_request
    def require_internal_key():
        expected = app.config.get('INTERNAL_API_KEY', '')
        provided = request.headers.get('X-Internal-Key', '')
        if not expected or provided != expected:
            abort(403)

    @app.after_request
    def set_security_headers(resp):
        resp.headers['X-Frame-Options'] = 'DENY'
        resp.headers['Content-Security-Policy'] = "frame-ancestors 'none'"
        return resp

    return app
