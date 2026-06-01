import time
import struct
import random
import hashlib
from Crypto.Util.number import getPrime
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad  
import os 

from spyspot.sys_hal import SystemControl, Watchdog, Timers
from spyspot.radio_driver import ZigBee_Transceiver
from spyspot.secure_element import TrueRNG
from spyspot.hw_accel import fast_decrypt_add
from spyspot.packet import PacketManager

PARAM_N = 50
PARAM_Q = 1017194805530087781866367482651
MAX_CYCLES = 5000

ADMIN_TOKEN = os.getenv('FLAG')


sys_ctx = {
    'modulus': 0,
    'secret_vector': [],
    'cycle_counter': 0,
    'radio': None
}

def init_hardware():
    wd = Watchdog()
    wd.feed()
    sys = SystemControl()
    timers = Timers()
    timers.register_timer("sovereign_pulse", 500)
    rng = TrueRNG()
    pktMgr = PacketManager()

    radio = ZigBee_Transceiver(port='/dev/ttyS1')
    radio.set_channel(11) 
    sys_ctx['radio'] = radio
    sys_ctx['modulus'] = 1017194805530087781866367482651
    sys_ctx['sys'] = sys 
    sys_ctx['timers'] = timers
    sys_ctx['rng'] = rng 
    sys_ctx['pktMgr'] = pktMgr
    _refresh_secret()

def _refresh_secret():
    rng = sys_ctx['rng']
    sys_ctx['secret_vector'] = [rng.randint(0, 1) for _ in range(PARAM_N)]
    sys_ctx['cycle_counter'] = 0

def _get_noise():
    return random.randint(-10, 10)

def generate_beacon():
    if sys_ctx['cycle_counter'] >= MAX_CYCLES:
        _refresh_secret()
    
    sys_ctx['cycle_counter'] += 1
    
    Q = sys_ctx['modulus']
    vec_a = [random.randint(0, Q-1) for _ in range(PARAM_N)]
    
    dot_prod = sum(a * s for a, s in zip(vec_a, sys_ctx['secret_vector']))
    val_b = (dot_prod + _get_noise()) % Q
    
    payload = bytearray()
    payload.extend(struct.pack('>I', sys_ctx['cycle_counter']))
    
    for val in vec_a:
        payload.extend(val.to_bytes(13, 'big')) 
    
    payload.extend(val_b.to_bytes(13, 'big'))
    
    return payload

def handle_incoming(packet):
    if not packet:
        return
    
    header = packet[:4]
    payload = packet[4:]

    if sys_ctx['pktMgr'].packet_is_data(header):
        fast_decrypt_add(header, payload)
    elif sys_ctx['pktMgr'].packet_is_sovereign_pulse(header):
        if not sys_ctx['pktMgr'].validate_sovereign_pulse(payload):
            sys_ctx['sys'].brick_device()

def _derive_aes_key(secret_vector):
    sv_str = "".join(str(x) for x in secret_vector)
    return hashlib.sha256(sv_str.encode()).digest()

def broadcast_sovereign_pulse():
    key = _derive_aes_key(sys_ctx['secret_vector'])
    cipher = AES.new(key, AES.MODE_ECB) 
    encrypted_token = cipher.encrypt(pad(ADMIN_TOKEN, 16))
    
    
    # Envoi via la radio
    sys_ctx['radio'].broadcast(encrypted_token)


def main_loop():
    init_hardware()
    wd = Watchdog()
    
    
    while True:
        wd.feed()
        
        sys_ctx['radio'].broadcast(generate_beacon())

        
        rx_packet = sys_ctx['radio'].receive(timeout=0.2)
        if rx_packet:
            handle_incoming(rx_packet)
            
        if sys_ctx['timers'].is_raised('sovereign_pulse'):
            sys_ctx['radio'].broadcast(broadcast_sovereign_pulse())

        time.sleep(0.1)

if __name__ == "__main__":
    main_loop()