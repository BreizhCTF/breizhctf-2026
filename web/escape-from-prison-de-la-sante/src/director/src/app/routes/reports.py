from flask import Blueprint, render_template
from ..services import api_client

bp = Blueprint('reports', __name__)


@bp.get('/')
def index():
    try:
        reports = api_client.get_reports()
    except Exception:
        reports = {}
    return render_template('reports.html', reports=reports)
