from flask import Blueprint, render_template, request, redirect, url_for, flash
from ..services import api_client
from .audit import log_event

bp = Blueprint('blocs', __name__)


@bp.get('/')
def index():
    try:
        stats = api_client.get_stats()
        blocs = stats.get('blocs', [])
    except Exception:
        blocs = []
        flash('Impossible de charger les blocs.', 'error')
    return render_template('blocs.html', blocs=blocs)


@bp.post('/<int:bloc_id>/lockdown')
def lockdown(bloc_id):
    reason = request.form.get('reason', 'Confinement disciplinaire')
    try:
        api_client.set_bloc_lockdown(bloc_id, reason)
        log_event('bloc_lockdown', detail=f'bloc_id={bloc_id} reason={reason!r}')
        flash('Confinement du bloc activé.', 'success')
    except Exception as e:
        flash(f'Erreur : {e}', 'error')
    return redirect(url_for('blocs.index'))


@bp.post('/<int:bloc_id>/lockdown/lift')
def lift_lockdown(bloc_id):
    try:
        api_client.lift_bloc_lockdown(bloc_id)
        log_event('bloc_lockdown_lift', detail=f'bloc_id={bloc_id}')
        flash('Confinement levé.', 'success')
    except Exception as e:
        flash(f'Erreur : {e}', 'error')
    return redirect(url_for('blocs.index'))
