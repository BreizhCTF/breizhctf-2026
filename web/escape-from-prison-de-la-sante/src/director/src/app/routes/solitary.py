from flask import Blueprint, render_template, request, redirect, url_for, flash
from ..services import api_client

bp = Blueprint('solitary', __name__)


@bp.post('/<int:inmate_id>/solitary')
def place_solitary(inmate_id):
    reason = request.form.get('reason', '')
    duration_days = request.form.get('durationDays', type=int, default=3)
    if not reason:
        flash('Motif requis.', 'error')
        return redirect(url_for('dashboard.index'))
    try:
        api_client.place_inmate_solitary(inmate_id, reason, duration_days)
        flash('Détenu placé en quartier d\'isolement.', 'success')
    except Exception as e:
        flash(f'Erreur : {e}', 'error')
    return redirect(url_for('dashboard.index'))
