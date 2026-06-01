import time
from datetime import datetime
from urllib.parse import urlparse
from hashlib import sha1

from flask.sessions import SecureCookieSessionInterface
from itsdangerous import URLSafeTimedSerializer
from playwright.sync_api import sync_playwright


BASE_URL = "http://localhost:5000"

print("Bot worker started.")

with open("/secret_key.txt", "r") as f:
    secret_key = f.read().strip()

keys: list[str | bytes] = []
keys.append(secret_key)
s = URLSafeTimedSerializer(
    keys,
    salt="cookie-session",
    serializer=SecureCookieSessionInterface.serializer,
    signer_kwargs={
        "key_derivation": "hmac",
        "digest_method": sha1,
    },
)

session_cookie = s.dumps({"user": "admin"})
print(f"Bot session cookie generated: {session_cookie}")

# pylint: disable=broad-except
while True:
    try:
        with sync_playwright() as p:
            print(f"[{datetime.now()}] Launching browser...")
            browser = p.chromium.launch(
                executable_path="/bin/chromium",
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage"],
            )
            context = browser.new_context()

            if session_cookie:
                domain = urlparse(BASE_URL).hostname
                context.add_cookies([
                    {
                        "name": "session",
                        "value": session_cookie,
                        "domain": domain,
                        "path": "/",
                        "sameSite": "Strict",
                    }
                ])

            page = context.new_page()

            try:
                print(f"Navigating to {BASE_URL}...")
                page.goto(BASE_URL)
                page.wait_for_selector("#logoutBtn", timeout=10000)
                print("Session valid, entered chat.")
            except Exception as e:
                print(f"Failed to load chat interface: {e}")
                browser.close()
                time.sleep(5)
                continue

            while True:
                time.sleep(5)

                if page.is_closed():
                    print("Page closed, restarting bot loop.")
                    break

                if not page.url.startswith(BASE_URL + "/"):
                    print("Navigated away from chat, restarting bot loop.")
                    break

                try:
                    user_items = page.locator(".user-item.unread").all()

                    if user_items:
                        print(f"[{datetime.now()}] Checking {len(user_items)} unread conversations...")

                    for item in user_items:
                        try:
                            if item.is_visible() and page.url.startswith(BASE_URL + "/"):
                                item.click()
                                time.sleep(2)
                        except Exception as e:
                            print(f"Error checking item: {e}")

                except Exception as e:
                    print(f"Error in check loop: {e}")
                    break

            browser.close()

    except Exception as e:
        print(f"Bot global error: {e}")
        time.sleep(5)
