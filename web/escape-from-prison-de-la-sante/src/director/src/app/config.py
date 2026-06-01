import os


class Config:
    SECRET_KEY = os.environ.get('FLASK_SECRET_KEY', os.urandom(32).hex())
    INTERNAL_API_KEY = os.environ.get('INTERNAL_API_KEY', 'changeme')
    NODE_API_URL = os.environ.get('NODE_API_URL', 'http://127.0.0.1:3000')
    DATABASE_URL = os.environ.get('DATABASE_URL', '')
    FLAG = os.environ.get('FLAG', 'BZHCTF{FakeFlag}')
