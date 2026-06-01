from flask import Blueprint, render_template
from ..services import api_client

bp = Blueprint('dashboard', __name__)


@bp.route('/')
def index():
    try:
        stats = api_client.get_stats()
    except Exception:
        stats = {}
    return render_template('dashboard.html', stats=stats)


@bp.get('/api/status')
def status():
    from flask import jsonify, current_app
    from datetime import datetime, timezone
    return jsonify({
        'status': 'ok',
        'service': 'Direction — Pénitentiaire de la Santé',
        'timestamp': datetime.now(timezone.utc).isoformat(),
    })
