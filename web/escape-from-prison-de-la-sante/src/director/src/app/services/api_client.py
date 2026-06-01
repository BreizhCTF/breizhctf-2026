import requests
from flask import current_app


def _headers():
    return {'X-Internal-Key': current_app.config['INTERNAL_API_KEY']}


def _base():
    return current_app.config['NODE_API_URL']


def get_stats():
    r = requests.get(f'{_base()}/internal/stats', headers=_headers(), timeout=5)
    r.raise_for_status()
    return r.json()


def get_guards():
    r = requests.get(f'{_base()}/internal/guards', headers=_headers(), timeout=5)
    r.raise_for_status()
    return r.json()


def create_guard(data):
    r = requests.post(f'{_base()}/internal/guards', json=data, headers=_headers(), timeout=5)
    r.raise_for_status()
    return r.json()


def delete_guard(guard_id):
    r = requests.delete(f'{_base()}/internal/guards/{guard_id}', headers=_headers(), timeout=5)
    r.raise_for_status()
    return r.json()


def get_reports():
    r = requests.get(f'{_base()}/internal/reports', headers=_headers(), timeout=5)
    r.raise_for_status()
    return r.json()


def get_leave_requests(status=None):
    params = {}
    if status:
        params['status'] = status
    r = requests.get(f'{_base()}/internal/leave-requests', headers=_headers(), params=params, timeout=5)
    r.raise_for_status()
    return r.json()


def decide_leave_request(request_id, approved, notes=''):
    r = requests.post(
        f'{_base()}/internal/leave-requests/{request_id}/decision',
        json={'approved': approved, 'notes': notes},
        headers=_headers(),
        timeout=5,
    )
    r.raise_for_status()
    return r.json()


def set_bloc_lockdown(bloc_id, reason):
    r = requests.post(
        f'{_base()}/internal/blocs/{bloc_id}/lockdown',
        json={'reason': reason},
        headers=_headers(),
        timeout=5,
    )
    r.raise_for_status()
    return r.json()


def lift_bloc_lockdown(bloc_id):
    r = requests.delete(
        f'{_base()}/internal/blocs/{bloc_id}/lockdown',
        headers=_headers(),
        timeout=5,
    )
    r.raise_for_status()
    return r.json()


def update_work_salary(job_id, pay_amount):
    r = requests.patch(
        f'{_base()}/internal/work-jobs/{job_id}/salary',
        json={'payAmount': pay_amount},
        headers=_headers(),
        timeout=5,
    )
    r.raise_for_status()
    return r.json()


def update_store_price(item_id, price):
    r = requests.patch(
        f'{_base()}/internal/store-items/{item_id}/price',
        json={'price': price},
        headers=_headers(),
        timeout=5,
    )
    r.raise_for_status()
    return r.json()


def place_inmate_solitary(inmate_id, reason, duration_days):
    r = requests.post(
        f'{_base()}/internal/inmates/{inmate_id}/solitary',
        json={'reason': reason, 'durationDays': duration_days},
        headers=_headers(),
        timeout=5,
    )
    r.raise_for_status()
    return r.json()
