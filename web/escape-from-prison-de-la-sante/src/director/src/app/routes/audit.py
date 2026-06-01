from flask import Blueprint, render_template
from ..models.audit_log import record, get_log

bp = Blueprint('audit', __name__)


def log_event(action, user='system', detail=''):
    record(action, user=user, detail=detail)


@bp.get('/')
def index():
    return render_template('audit.html', logs=get_log())
