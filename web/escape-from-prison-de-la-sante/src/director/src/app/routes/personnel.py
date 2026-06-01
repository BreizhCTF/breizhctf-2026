from flask import Blueprint, render_template, request, redirect, url_for, flash
from ..services import api_client
from .audit import log_event

bp = Blueprint('personnel', __name__)


@bp.get('/')
def index():
    try:
        guards = api_client.get_guards()
    except Exception:
        guards = []
        flash('Impossible de charger la liste du personnel.', 'error')
    return render_template('personnel.html', guards=guards)


@bp.post('/')
def create():
    data = {
        'username': request.form.get('username'),
        'email': request.form.get('email'),
        'password': request.form.get('password'),
    }
    try:
        api_client.create_guard(data)
        log_event('create_guard', detail=f'username={data.get("username")} email={data.get("email")}')
        flash('Agent créé avec succès.', 'success')
    except Exception as e:
        flash(f'Erreur : {e}', 'error')
    return redirect(url_for('personnel.index'))


@bp.post('/<int:guard_id>/delete')
def delete(guard_id):
    try:
        api_client.delete_guard(guard_id)
        log_event('delete_guard', detail=f'guard_id={guard_id}')
        flash('Agent désactivé.', 'success')
    except Exception as e:
        flash(f'Erreur : {e}', 'error')
    return redirect(url_for('personnel.index'))
