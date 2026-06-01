from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from ..services import api_client
from .audit import log_event

bp = Blueprint('budget', __name__)


@bp.get('/')
def index():
    try:
        stats = api_client.get_stats()
    except Exception:
        stats = {}
    return render_template('budget.html', stats=stats)


@bp.post('/salary/<int:job_id>')
def update_salary(job_id):
    pay_amount = request.form.get('payAmount', type=float)
    if not pay_amount or pay_amount <= 0:
        flash('Montant invalide.', 'error')
        return redirect(url_for('budget.index'))
    try:
        api_client.update_work_salary(job_id, pay_amount)
        log_event('update_salary', detail=f'job_id={job_id} pay_amount={pay_amount}')
        flash('Rémunération mise à jour.', 'success')
    except Exception as e:
        flash(f'Erreur : {e}', 'error')
    return redirect(url_for('budget.index'))


@bp.post('/price/<int:item_id>')
def update_price(item_id):
    price = request.form.get('price', type=float)
    if price is None or price < 0:
        flash('Prix invalide.', 'error')
        return redirect(url_for('budget.index'))
    try:
        api_client.update_store_price(item_id, price)
        log_event('update_price', detail=f'item_id={item_id} price={price}')
        flash('Prix mis à jour.', 'success')
    except Exception as e:
        flash(f'Erreur : {e}', 'error')
    return redirect(url_for('budget.index'))
