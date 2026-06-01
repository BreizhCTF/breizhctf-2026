from datetime import datetime, timezone

_log = []
MAX_ENTRIES = 200


def record(action, user='system', detail=''):
    _log.insert(0, {
        'action': action,
        'user': user,
        'detail': detail,
        'timestamp': datetime.now(timezone.utc).isoformat(),
    })
    if len(_log) > MAX_ENTRIES:
        _log.pop()


def get_log():
    return list(_log)
