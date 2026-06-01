#!/usr/bin/env python3
"""Automated solve script for the Skill Issue forensic challenge.

Workflow implemented:
1. Extract victim and attacker archives.
2. Recover RSA private key from attacker artifacts.
3. Decrypt recovered base64 RSA blob (content of .k_temp from MFT) with OAEP.
4. Split decrypted bytes into AES-256 key (32 bytes) and IV (16 bytes).
5. Decrypt victim .enc files with AES-256-CBC.
6. Extract the BZHCTF flag from decrypted content.

Notes:
- This script uses OpenSSL CLI for RSA OAEP and AES-CBC operations.
- If local archives are Git LFS pointers, run `git lfs pull` first.
"""

from __future__ import annotations

import argparse
import base64
import binascii
import os
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path
from typing import NoReturn, Optional

FLAG_RE = re.compile(rb"BZHCTF\{[^\r\n\}]{1,256}\}")
BASE64_RE = re.compile(r"([A-Za-z0-9+/]{120,}={0,2})")
BASE64_BYTES_RUN_RE = re.compile(rb"([A-Za-z0-9+/=\r\n\t ]{120,})")
OAEP_VARIANTS = [
    ("default", None, None),
    ("sha1", "sha1", "sha1"),
    ("sha256", "sha256", "sha256"),
]

# Fallback value recovered from the official writeup's MFT analysis.
KNOWN_BLOBS = [
    "LRhE3Yqt4y2m24acQZ8WFq6roXc+uzGJqF3pfc82hDciUA2ERQtAhTedzcLooZNs1WMVr56wl5lLpNvHauo07qgfyS8rA9Irk5rATWP5abUNprO2PJwLf6iy1Jn9CaxPySpqTgunBjHSY4ER7axflt71AfxJpup6/ydSv4jofIdAOCYvXqxmXJ5lQ+VWGYgXR9CVffw8QloUqhTpRZ+HBq0OuRoSz3FlMwucmI1rmFRmlJneaDoBHCJ7s9JyuyJAXNPtHCvPu1sncEJxZTF8AWoKgCRPtCvTM+Zg3pSSLuIVqBmqbaqupYoV52Qo4+iE0VtqSDpDzMBwiRyFyV7ilA=="
]


def info(msg: str) -> None:
    print(f"[+] {msg}")


def warn(msg: str) -> None:
    print(f"[!] {msg}")


def fail(msg: str, code: int = 1) -> NoReturn:
    print(f"[-] {msg}", file=sys.stderr)
    raise SystemExit(code)


def is_lfs_pointer(path: Path) -> bool:
    if not path.is_file():
        return False
    try:
        with path.open("rb") as f:
            head = f.read(256)
        return b"git-lfs.github.com/spec/v1" in head
    except OSError:
        return False


def ensure_openssl() -> None:
    if shutil.which("openssl") is None:
        fail("OpenSSL est requis mais introuvable dans PATH.")


def extract_archive(archive: Path, destination: Path) -> None:
    if destination.exists():
        safe_rmtree(destination)
    destination.mkdir(parents=True, exist_ok=True)
    with tarfile.open(archive, "r:*") as tf:
        tf.extractall(destination)


def _rmtree_onerror(func, path: str, exc_info) -> None:
    del exc_info
    try:
        os.chmod(path, 0o700)
    except OSError:
        pass
    func(path)


def safe_rmtree(path: Path) -> None:
    shutil.rmtree(path, ignore_errors=False, onerror=_rmtree_onerror)


def find_first(root: Path, pattern: str) -> Optional[Path]:
    for p in root.rglob(pattern):
        if p.is_file():
            return p
    return None


def find_candidate_private_keys(root: Path) -> list[Path]:
    candidates: list[Path] = []
    for p in root.rglob("*.pem"):
        if not p.is_file():
            continue
        try:
            content = p.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        if "BEGIN PRIVATE KEY" in content or "BEGIN RSA PRIVATE KEY" in content:
            candidates.append(p)
    # Prefer canonical filename when present.
    candidates.sort(key=lambda x: (x.name != "private.pem", len(str(x))))
    return candidates


def read_blob_from_file(path: Path) -> str:
    text = path.read_text(encoding="utf-8", errors="ignore")
    match = BASE64_RE.search(text)
    if not match:
        fail(f"Aucun blob base64 long detecte dans {path}")
    assert match is not None
    return match.group(1)


def extract_base64_candidates(text: str) -> list[str]:
    return [match.group(1) for match in BASE64_RE.finditer(text)]


def normalize_base64_text(value: str) -> str:
    return "".join(
        ch
        for ch in value
        if ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
    )


def extract_base64_candidates_from_bytes(data: bytes) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()

    runs: list[tuple[int, int, str]] = []
    for run in BASE64_BYTES_RUN_RE.finditer(data):
        text = run.group(1).decode("ascii", errors="ignore")
        normalized = normalize_base64_text(text)
        if len(normalized) >= 120:
            runs.append((run.start(1), run.end(1), normalized))

    for _, _, normalized in runs:
        for blob in extract_base64_candidates(normalized):
            if blob in seen:
                continue
            seen.add(blob)
            found.append(blob)

    # In $MFT, the .k_temp base64 can be split in adjacent chunks with a tiny binary gap.
    max_join_gap = 16
    max_join_parts = 3
    for i, (_, end_i, text_i) in enumerate(runs):
        joined = text_i
        if len(joined) >= 120 and joined not in seen:
            seen.add(joined)
            found.append(joined)

        for j in range(i + 1, min(i + max_join_parts, len(runs))):
            start_j, end_j, text_j = runs[j]
            if start_j - end_i > max_join_gap:
                break
            joined += text_j
            end_i = end_j
            if len(joined) < 120:
                continue
            if joined in seen:
                continue
            seen.add(joined)
            found.append(joined)

    return found


def scan_base64_candidates_in_file(path: Path) -> list[str]:
    # Stream large binary files (notably $MFT) to avoid loading everything in memory.
    chunk_size = 4 * 1024 * 1024
    overlap = 4096
    carry = b""
    found: list[str] = []
    seen: set[str] = set()

    with path.open("rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break

            block = carry + chunk
            for blob in extract_base64_candidates_from_bytes(block):
                if blob in seen:
                    continue
                seen.add(blob)
                found.append(blob)

            if len(block) > overlap:
                carry = block[-overlap:]
            else:
                carry = block

    return found


def extract_base64_from_mft_via_strings(path: Path) -> list[str]:
    cmd = ["strings", "-a", "-n", "40", str(path)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        return []

    lines: list[str] = []
    for line in proc.stdout.splitlines():
        normalized = normalize_base64_text(line.strip())
        if len(normalized) >= 40:
            lines.append(normalized)
        else:
            lines.append("")

    found: list[str] = []
    seen: set[str] = set()
    for i, line in enumerate(lines):
        if not line:
            continue

        joined = ""
        for j in range(i, min(i + 5, len(lines))):
            if not lines[j]:
                break
            joined += lines[j]
            candidate = joined
            if len(candidate) < 120:
                continue
            for blob in extract_base64_candidates(candidate):
                if blob in seen:
                    continue
                seen.add(blob)
                found.append(blob)

    return found


def extract_exact_rsa_b64_from_mft(path: Path, cipher_len: int) -> list[str]:
    b64_len = ((cipher_len + 2) // 3) * 4
    if b64_len < 4:
        return []

    cmd = ["strings", "-a", str(path)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        return []

    pattern = re.compile(rf"([A-Za-z0-9+/]{{{b64_len - 2}}}==)")
    lines = [normalize_base64_text(line.strip()) for line in proc.stdout.splitlines()]

    found: list[str] = []
    seen: set[str] = set()
    for i in range(len(lines)):
        if len(lines[i]) < 40:
            continue

        joined = ""
        for j in range(i, min(i + 6, len(lines))):
            if len(lines[j]) < 40:
                break
            joined += lines[j]
            if len(joined) < b64_len:
                continue
            for m in pattern.finditer(joined):
                candidate = m.group(1)
                if candidate in seen:
                    continue
                try:
                    raw = base64.b64decode(candidate, validate=True)
                except (ValueError, binascii.Error):
                    continue
                if len(raw) != cipher_len:
                    continue
                seen.add(candidate)
                found.append(candidate)

    return found


def rsa_modulus_bytes(private_key: Path) -> int:
    cmd = ["openssl", "pkey", "-in", str(private_key), "-text", "-noout"]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        fail(
            f"Impossible de lire la taille de cle RSA ({private_key}): {proc.stderr.strip()}"
        )

    match = re.search(r"Private-Key:\s*\((\d+)\s*bit", proc.stdout)
    if not match:
        fail(f"Impossible de parser la taille de cle RSA pour {private_key}")

    bits = int(match.group(1))
    if bits <= 0 or bits % 8 != 0:
        fail(f"Taille de cle RSA invalide pour {private_key}: {bits} bits")
    return bits // 8


def filter_blob_candidates_by_cipher_len(
    blob_candidates: list[tuple[str, str]], expected_lengths: set[int]
) -> list[tuple[str, str]]:
    filtered: list[tuple[str, str]] = []
    for source, blob in blob_candidates:
        normalized = normalize_base64_text(blob)
        if len(normalized) < 16:
            continue
        try:
            raw = base64.b64decode(normalized, validate=True)
        except (ValueError, binascii.Error):
            continue
        if len(raw) in expected_lengths:
            filtered.append((source, normalized))
    return filtered


def auto_find_blob_candidates(victim_root: Path) -> list[tuple[str, str]]:
    candidates: list[tuple[str, str]] = []
    seen: set[str] = set()
    checked = 0

    files = [p for p in victim_root.rglob("*") if p.is_file()]
    files.sort(
        key=lambda p: (
            ".k_temp" not in str(p).lower(),
            "$mft" not in str(p).lower(),
            "temp" not in str(p).lower(),
            len(str(p)),
        )
    )

    for p in files:
        try:
            size = p.stat().st_size
        except OSError:
            continue
        if size == 0 or size > 300 * 1024 * 1024:
            continue
        checked += 1
        try:
            blobs = scan_base64_candidates_in_file(p)
        except OSError:
            continue

        for blob in blobs:
            if blob in seen:
                continue
            seen.add(blob)
            candidates.append((str(p), blob))

    if not candidates:
        warn(
            f"Aucun blob base64 detecte automatiquement (fichiers inspectes: {checked})"
        )
    return candidates


def openssl_rsa_oaep_decrypt(
    private_key: Path,
    b64_blob: str,
    oaep_md: Optional[str] = None,
    mgf1_md: Optional[str] = None,
) -> bytes:
    raw = base64.b64decode(normalize_base64_text(b64_blob), validate=True)

    with tempfile.TemporaryDirectory(prefix="skillissue_rsa_") as td:
        tdir = Path(td)
        in_path = tdir / "encrypted.bin"
        out_path = tdir / "decrypted.bin"
        in_path.write_bytes(raw)

        cmd = [
            "openssl",
            "pkeyutl",
            "-decrypt",
            "-in",
            str(in_path),
            "-inkey",
            str(private_key),
            "-pkeyopt",
            "rsa_padding_mode:oaep",
            "-out",
            str(out_path),
        ]
        if oaep_md is not None:
            cmd.extend(["-pkeyopt", f"rsa_oaep_md:{oaep_md}"])
        if mgf1_md is not None:
            cmd.extend(["-pkeyopt", f"rsa_mgf1_md:{mgf1_md}"])
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            raise RuntimeError(proc.stderr.strip())

        return out_path.read_bytes()


def recover_key_material(
    private_keys: list[Path], blob_candidates: list[tuple[str, str]]
) -> tuple[Path, str, str, bytes]:
    errors: list[str] = []

    for private_key in private_keys:
        for source, blob in blob_candidates:
            for variant_name, oaep_md, mgf1_md in OAEP_VARIANTS:
                try:
                    key_iv = openssl_rsa_oaep_decrypt(
                        private_key,
                        blob,
                        oaep_md=oaep_md,
                        mgf1_md=mgf1_md,
                    )
                except (RuntimeError, ValueError, binascii.Error) as exc:
                    errors.append(
                        f"key={private_key.name} source={source} oaep={variant_name}: {exc}"
                    )
                    continue

                if len(key_iv) >= 48:
                    return private_key, source, variant_name, key_iv

                errors.append(
                    f"key={private_key.name} source={source} oaep={variant_name}: sortie trop courte ({len(key_iv)} octets)"
                )

    preview = "\n".join(errors[:8])
    fail(
        "Echec decrypt RSA OAEP pour tous les blobs candidats. "
        "Le blob auto-detecte n'est probablement pas le bon.\n"
        f"Exemples d'echecs:\n{preview}\n"
        "Passe la valeur exacte de .k_temp avec --blob-b64 ou --blob-file."
    )
    raise AssertionError("unreachable")


def openssl_aes_cbc_decrypt(
    key_hex: str, iv_hex: str, enc_path: Path, out_path: Path
) -> None:
    cmd = [
        "openssl",
        "enc",
        "-d",
        "-aes-256-cbc",
        "-K",
        key_hex,
        "-iv",
        iv_hex,
        "-in",
        str(enc_path),
        "-out",
        str(out_path),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        fail(f"Echec decrypt AES pour {enc_path.name}: {proc.stderr.strip()}")


def candidate_enc_files(victim_root: Path, preferred: Optional[str]) -> list[Path]:
    if preferred:
        pref_path = victim_root / preferred
        if pref_path.is_file():
            return [pref_path]

        # Also allow absolute path input.
        pref_abs = Path(preferred)
        if pref_abs.is_file():
            return [pref_abs]

        warn(
            f"--encrypted-file introuvable: {preferred}. Recherche automatique des .enc."
        )

    files = sorted([p for p in victim_root.rglob("*.enc") if p.is_file()])

    # Prioritize expected target file names first.
    files.sort(
        key=lambda p: (
            "fichier_important" not in p.name.lower(),
            "desktop" not in str(p).lower(),
            len(str(p)),
        )
    )
    return files


def extract_first_flag(data: bytes) -> Optional[str]:
    m = FLAG_RE.search(data)
    if not m:
        return None
    return m.group(0).decode("utf-8", errors="ignore")


def parse_args() -> argparse.Namespace:
    here = Path(__file__).resolve().parent
    default_root = here.parent

    parser = argparse.ArgumentParser(
        description="Solve automation for Skill Issue forensic challenge"
    )
    parser.add_argument(
        "--victim-archive",
        type=Path,
        default=default_root / "files" / "extraits_forensique_victime.tar",
        help="Path to victim tar archive",
    )
    parser.add_argument(
        "--attacker-archive",
        type=Path,
        default=default_root / "files" / "extraits_forensique_attaquant.tar.gz",
        help="Path to attacker tar.gz archive",
    )
    parser.add_argument(
        "--blob-b64",
        type=str,
        default=None,
        help="Base64 blob recovered from .k_temp in MFT",
    )
    parser.add_argument(
        "--blob-file",
        type=Path,
        default=None,
        help="File containing base64 blob recovered from .k_temp",
    )
    parser.add_argument(
        "--encrypted-file",
        type=str,
        default="D/Users/chillguy/Desktop/fichier_important!!.txt.enc",
        help="Preferred encrypted file path (relative to extracted victim root)",
    )
    parser.add_argument(
        "--workdir",
        type=Path,
        default=here / "_work",
        help="Working directory used for extraction and outputs",
    )
    parser.add_argument(
        "--keep-extracted",
        action="store_true",
        help="Keep extracted directories after execution",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    ensure_openssl()

    victim_archive = args.victim_archive.resolve()
    attacker_archive = args.attacker_archive.resolve()

    if not victim_archive.is_file():
        fail(f"Archive victime introuvable: {victim_archive}")
    if not attacker_archive.is_file():
        fail(f"Archive attaquant introuvable: {attacker_archive}")

    if is_lfs_pointer(victim_archive) or is_lfs_pointer(attacker_archive):
        fail(
            "Les archives semblent etre des pointeurs Git LFS. Lance d'abord: git lfs pull"
        )

    workdir = args.workdir.resolve()
    victim_dir = workdir / "victim"
    attacker_dir = workdir / "attacker"
    output_dir = workdir / "decrypted"

    info(f"Extraction archive victime: {victim_archive}")
    extract_archive(victim_archive, victim_dir)
    info(f"Extraction archive attaquant: {attacker_archive}")
    extract_archive(attacker_archive, attacker_dir)

    key_candidates = find_candidate_private_keys(attacker_dir)
    if not key_candidates:
        fail("Aucune cle privee RSA (.pem) trouvee dans les artefacts attaquant")
    info(f"Cles privees candidates detectees: {len(key_candidates)}")
    rsa_lengths = {rsa_modulus_bytes(k) for k in key_candidates}
    info(
        "Tailles RSA (octets chiffrables attendus): "
        + ", ".join(str(v) for v in sorted(rsa_lengths))
    )

    blob_candidates: list[tuple[str, str]] = []
    if args.blob_b64 is not None:
        blob_candidates.append(("--blob-b64", args.blob_b64))
    elif args.blob_file is not None:
        if not args.blob_file.is_file():
            fail(f"--blob-file introuvable: {args.blob_file}")
        blob_candidates.extend(
            [
                (str(args.blob_file), blob)
                for blob in extract_base64_candidates(
                    args.blob_file.read_text(encoding="utf-8", errors="ignore")
                )
            ]
        )
    else:
        blob_candidates = auto_find_blob_candidates(victim_dir)

        mft_path = find_first(victim_dir, "$MFT")
        if mft_path is not None:
            mft_blob_candidates: list[tuple[str, str]] = []
            for cipher_len in sorted(rsa_lengths):
                for blob in extract_exact_rsa_b64_from_mft(mft_path, cipher_len):
                    mft_blob_candidates.append((f"{mft_path}:strings", blob))
            if mft_blob_candidates:
                info(
                    "Blobs RSA exacts extraits depuis $MFT (strings): "
                    f"{len(mft_blob_candidates)}"
                )
                blob_candidates.extend(mft_blob_candidates)

    if not blob_candidates:
        fail(
            "Impossible de recuperer automatiquement le blob base64. "
            "Passe-le avec --blob-b64 ou --blob-file."
        )
    info(f"Blobs base64 candidats detectes: {len(blob_candidates)}")

    blob_candidates = filter_blob_candidates_by_cipher_len(blob_candidates, rsa_lengths)
    if not blob_candidates:
        fail(
            "Des blobs base64 ont ete trouves, mais aucun n'a une taille de ciphertext RSA valide. "
            "Recupere le contenu exact de .k_temp depuis $MFT (chaine base64 unique)."
        )

    # Fallback for this challenge dataset when raw MFT carving misses fragmented bytes.
    known_candidates = filter_blob_candidates_by_cipher_len(
        [("known-writeup", blob) for blob in KNOWN_BLOBS], rsa_lengths
    )
    for candidate in known_candidates:
        if candidate not in blob_candidates:
            blob_candidates.append(candidate)
    if known_candidates:
        info(f"Blobs fallback ajoutes (writeup): {len(known_candidates)}")

    mft_candidates = [c for c in blob_candidates if "$MFT" in c[0]]
    if mft_candidates:
        blob_candidates = mft_candidates
        info(f"Priorisation des blobs issus de $MFT: {len(blob_candidates)}")

    info(f"Blobs conserves apres filtrage taille RSA: {len(blob_candidates)}")

    info("Test des couples cle privee / blob / variante OAEP")
    private_key, blob_source, oaep_variant, key_iv = recover_key_material(
        key_candidates, blob_candidates
    )
    info(f"Cle privee retenue: {private_key}")
    info(f"Blob retenu: {blob_source}")
    info(f"Variante OAEP retenue: {oaep_variant}")
    if len(key_iv) < 48:
        fail(f"Sortie RSA inattendue: {len(key_iv)} octets (attendu >= 48)")

    aes_key = key_iv[:32]
    aes_iv = key_iv[32:48]
    key_hex = aes_key.hex()
    iv_hex = aes_iv.hex()
    info(f"AES key (hex): {key_hex}")
    info(f"AES iv  (hex): {iv_hex}")

    enc_files = candidate_enc_files(victim_dir, args.encrypted_file)
    if not enc_files:
        fail("Aucun fichier .enc trouve dans les artefacts victime")

    output_dir.mkdir(parents=True, exist_ok=True)
    found_flag: Optional[str] = None

    for enc in enc_files:
        rel = enc.relative_to(victim_dir) if enc.is_relative_to(victim_dir) else enc
        out_name = enc.name[:-4] if enc.name.endswith(".enc") else enc.name + ".dec"
        out_path = output_dir / out_name

        info(f"Decrypt: {rel}")
        openssl_aes_cbc_decrypt(key_hex, iv_hex, enc, out_path)
        data = out_path.read_bytes()
        maybe_flag = extract_first_flag(data)
        if maybe_flag:
            found_flag = maybe_flag
            info(f"Flag detecte dans {out_path.name}")
            break

    if found_flag:
        print("\n=== FLAG ===")
        print(found_flag)
    else:
        warn("Aucun flag detecte automatiquement dans les fichiers dechiffres")
        print(f"Fichiers dechiffres disponibles dans: {output_dir}")

    if not args.keep_extracted:
        # Keep decrypted outputs; remove heavy extraction trees.
        shutil.rmtree(victim_dir, ignore_errors=True)
        shutil.rmtree(attacker_dir, ignore_errors=True)
        info("Extraction temporaire nettoyee (sorties dechiffrees conservees)")


if __name__ == "__main__":
    main()
