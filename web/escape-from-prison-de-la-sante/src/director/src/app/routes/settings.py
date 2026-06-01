import json
import logging
import logging.config
import urllib.request
from datetime import datetime, timezone
from flask import Blueprint, render_template, request, jsonify, current_app

bp = Blueprint('settings', __name__)


@bp.get('/')
def index():
    return render_template('settings.html')


@bp.get('/api/config/reload')
def reload_logging_config():
    source_url = request.args.get('url')
    if not source_url:
        return jsonify({'error': 'Paramètre url manquant'}), 400

    try:
        with urllib.request.urlopen(source_url) as resp:
            config_data = json.loads(resp.read())
        logging.config.dictConfig(config_data)
        return jsonify({
            'status': 'reloaded',
            'timestamp': datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

