import hmac
import hashlib
import pytest

from Crypto.Cipher import AES
from ragger.backend.interface import BackendInterface
from ragger.error import ExceptionRAPDU

CLA = 0xE0

INS_STEP_INIT   = 0x10
INS_STEP_KEY    = 0x11
INS_STEP_CONFIG = 0x12
INS_STEP_VERIFY = 0x13
INS_STEP_ARM    = 0x14
INS_PRINT_FLAG  = 0x20
INS_SET_FLAG    = 0xFF

SW_OK = 0x9000

INJECT_HMAC_KEY = bytes([
    0x4B, 0x72, 0x65, 0x69, 0x7A, 0x68, 0x5F, 0x48,
    0x4D, 0x41, 0x43, 0x5F, 0x4B, 0x33, 0x59, 0x21,
    0x42, 0x5A, 0x48, 0x43, 0x54, 0x46, 0x32, 0x30,
    0x32, 0x35, 0x4C, 0x65, 0x64, 0x67, 0x65, 0x72,
])

INJECT_IV = bytes([
    0xDE, 0xAD, 0xBE, 0xEF, 0xCA, 0xFE, 0xBA, 0xBE,
    0x13, 0x37, 0x42, 0x69, 0xB2, 0x48, 0x21, 0x21,
])

SM_XOR_KEY      = bytes([0x42, 0x52, 0x45, 0x49, 0x5A, 0x48, 0x21, 0x21])
SM_KEY_EXPECTED = bytes([0x01, 0x20, 0x76, 0x39, 0x69, 0x3B, 0x63, 0x7B])

SM_MINI_SBOX = [0x0E, 0x04, 0x0D, 0x01, 0x02, 0x0F, 0x0B, 0x08,
                0x03, 0x0A, 0x06, 0x0C, 0x05, 0x09, 0x00, 0x07]

SM_VERIFY_EXPECTED = [0xB4, 0xE1, 0x7C, 0x2D]

FLAG_SIZE = 32
TEST_FLAG = "BZHCTF{t3st_fl4g_for_c1}"


def build_set_flag_payload(flag: str) -> bytes:
    plaintext = flag.encode("ascii")
    plaintext += b"\x00" * (FLAG_SIZE - len(plaintext))
    cipher = AES.new(INJECT_HMAC_KEY, AES.MODE_CBC, INJECT_IV)
    ct = cipher.encrypt(plaintext)
    mac = hmac.new(INJECT_HMAC_KEY, ct, hashlib.sha256).digest()
    return mac + ct


def compute_key_data() -> bytes:
    return bytes([e ^ k for e, k in zip(SM_KEY_EXPECTED, SM_XOR_KEY)])


def compute_verify_data() -> bytes:
    inv = [0] * 16
    for i in range(16):
        inv[SM_MINI_SBOX[i]] = i
    result = []
    for b in SM_VERIFY_EXPECTED:
        result.append((inv[b >> 4] << 4) | inv[b & 0xF])
    return bytes(result)


def walk_state_machine(backend):
    backend.exchange(CLA, INS_STEP_INIT, p1=0x42, p2=0x5A)
    backend.exchange(CLA, INS_STEP_KEY, p1=0x01, p2=0x00, data=compute_key_data())
    backend.exchange(CLA, INS_STEP_CONFIG, p1=0x03, p2=0x07)
    backend.exchange(CLA, INS_STEP_VERIFY, p1=0x00, p2=0x00, data=compute_verify_data())
    backend.exchange(CLA, INS_STEP_ARM, p1=0x13, p2=0x37)
    backend.exchange(CLA, INS_PRINT_FLAG, p1=0x00, p2=0x00)


def test_full_challenge_solve(backend: BackendInterface):
    payload = build_set_flag_payload(TEST_FLAG)
    backend.exchange(CLA, INS_SET_FLAG, p1=0x00, p2=0x00, data=payload)
    walk_state_machine(backend)


def test_wrong_sequence_resets(backend: BackendInterface):
    backend.exchange(CLA, INS_STEP_INIT, p1=0x42, p2=0x5A)

    with pytest.raises(ExceptionRAPDU) as exc:
        backend.exchange(CLA, INS_STEP_CONFIG, p1=0x03, p2=0x07)
    assert exc.value.status != SW_OK

    # state reset, INIT should work again
    backend.exchange(CLA, INS_STEP_INIT, p1=0x42, p2=0x5A)


def test_wrong_init_p1p2(backend: BackendInterface):
    with pytest.raises(ExceptionRAPDU) as exc:
        backend.exchange(CLA, INS_STEP_INIT, p1=0x00, p2=0x00)
    assert exc.value.status != SW_OK


def test_set_flag_only_once(backend: BackendInterface):
    payload = build_set_flag_payload(TEST_FLAG)
    backend.exchange(CLA, INS_SET_FLAG, p1=0x00, p2=0x00, data=payload)

    with pytest.raises(ExceptionRAPDU) as exc:
        backend.exchange(CLA, INS_SET_FLAG, p1=0x00, p2=0x00, data=payload)
    assert exc.value.status != SW_OK


def test_set_flag_bad_hmac(backend: BackendInterface):
    payload = build_set_flag_payload(TEST_FLAG)
    corrupted = bytes([payload[0] ^ 0xFF]) + payload[1:]

    with pytest.raises(ExceptionRAPDU) as exc:
        backend.exchange(CLA, INS_SET_FLAG, p1=0x00, p2=0x00, data=corrupted)
    assert exc.value.status != SW_OK


def test_no_flag_loaded(backend: BackendInterface):
    walk_state_machine(backend)
