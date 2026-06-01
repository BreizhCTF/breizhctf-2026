from flask import Blueprint, render_template, request, redirect, url_for, flash
from ..services import api_client
from .audit import log_event

bp = Blueprint('permissions', __name__)


@bp.get('/')
def index():
    status = request.args.get('status', 'pending')
    try:
        requests_list = api_client.get_leave_requests(status=status)
    except Exception:
        requests_list = []
        flash('Impossible de charger les demandes.', 'error')
    return render_template('permissions.html', requests=requests_list, current_status=status)


@bp.post('/<int:request_id>/decision')
def decide(request_id):
    approved = request.form.get('decision') == 'approved'
    notes = request.form.get('notes', '')
    try:
        api_client.decide_leave_request(request_id, approved, notes)
        decision_str = 'approved' if approved else 'denied'
        log_event('leave_decision', detail=f'request_id={request_id} decision={decision_str}')
        flash('Décision enregistrée.', 'success')
    except Exception as e:
        flash(f'Erreur : {e}', 'error')
    return redirect(url_for('permissions.index'))
