"""BzhMessenger seed data: users, channels, and ambient chat."""

import hashlib
import os
import random
import sqlite3
import threading
import time
import uuid

USERS = {
    "player": {"password": "bzhctf2026", "avatar": "P", "color": "#825EFF", "avatar_url": "https://i.pinimg.com/736x/81/04/84/81048431d01ffd545d23e310ea33c3d8.jpg"},
    "admin": {"avatar": "A", "color": "#FEEA00"},
    "bot": {"password": "Tz9qVm3KrW7xNj2Yp6Lc", "avatar": "B", "color": "#44DD88"},
    "pwnii": {"avatar": "N", "color": "#E91E63", "avatar_url": "https://pbs.twimg.com/profile_images/1882515198134640641/7_FzYFle_400x400.jpg"},
    "rami": {"avatar": "K", "color": "#3498DB", "avatar_url": "https://i.pinimg.com/736x/29/7d/70/297d7032c7130df88e4ba2926a039a29.jpg"},
    "KØDΛ": {"avatar": "D", "color": "#9B59B6", "avatar_url": "https://cdn.discordapp.com/avatars/606833408420872223/7c105c1cb3b96a6a02df03e6ea847acc.png"},
    "breizhctf_fan": {"avatar": "b", "color": "#2ECC71"},
    "T4stY_cR0u5tY": {"avatar": "H", "color": "#E74C3C"},
    "22_bossman": {"avatar": "F", "color": "#1ABC9C", "avatar_url": "https://i.pinimg.com/736x/26/f7/40/26f7400308bd794cd398b2b58a5d3b50.jpg"},
    "Rebecca": {"avatar": "Z", "color": "#F39C12", "avatar_url": "https://i.pinimg.com/736x/93/bd/3b/93bd3b7c23a5f6d893175ad3fcbc2b55.jpg"},
    "Make-Breakcore-Great-Again": {"avatar": "m", "color": "#E67E22"},
    "music_lover42": {"avatar": "M", "color": "#FF6B6B"},
}

CHANNELS = [
    {"id": "general", "name": "general", "topic": "Discussion generale"},
    {"id": "announcements", "name": "announcements", "topic": "Annonces officielles"},
    {"id": "flag-submission", "name": "flag-submission", "topic": "Soumettez vos flags ici"},
]

SEED_IMAGES = {
    "claude.gif": "https://cleverhack.com/img/clawd.gif",
    "geeked.jpg": "https://i.pinimg.com/1200x/49/a3/09/49a3095e4acbfd4eeb966dbe7734ab83.jpg",
    "rami.jpg": "https://i.pinimg.com/736x/95/aa/ad/95aaad8b962ea82fa010efe963fb0ede.jpg",
    "rebecca.jpg": "https://i.pinimg.com/736x/ef/a0/c1/efa0c1248dff479b0f421d3a733c2e31.jpg"
}

# (channel, user, content, image_key or None)
# The first INITIAL_COUNT messages are posted instantly at startup, the rest trickle in.
# Announcements and flag-submission are placed early so all channels have content on arrival.
AMBIENT_MESSAGES = [
    # -- announcements (immediate) --
    ("announcements", "admin", "Bienvenue sur le serveur officiel du BreizhCTF 2026 !", None),
    ("announcements", "admin", "Reglement : pas de bruteforce sur l'infra, pas de DoS, pas d'attaques sur les autres equipes. Jouez fair-play et sans share flag.", None),
    ("announcements", "admin", "Notre app mobile BzhMessenger est dispo ! Telechargez l'APK depuis notre site.", None),
    ("announcements", "admin", "Rappel : les flags sont au format BZHCTF{...}. Soumettez-les dans #flag-submission.", None),
    # -- flag-submission (immediate) --
    ("flag-submission", "admin", "Postez vos flags dans ce channel. Le bot les verifiera automatiquement.", None),
    ("flag-submission", "bot", "Flag submission bot ready. Format: BZHCTF{...}", None),
    ("flag-submission", "rami", "BZHCTF{w3b_xss_1s_d3ad_they_s4id}", None),
    ("flag-submission", "bot", "Flag correct ! Challenge: XSS 101 - GG @rami", None),
    ("flag-submission", "T4stY_cR0u5tY", "BZHCTF{sql1_un10n_s3l3ct_ftw}", None),
    ("flag-submission", "bot", "Flag correct ! Challenge: SQL Injection - GG @T4stY_cR0u5tY", None),
    # -- general (immediate) --
    ("general", "admin", "Bienvenue sur BzhMessenger ! L'app officielle du BreizhCTF 2026.", None),
    ("general", "rami", "yo tout le monde !", None),
    ("general", "pwnii", "adoptez la geeked life pour être heureux", "geeked.jpg"),
    ("general", "KØDΛ", "Coucou pwnii ! trop content de te voir :D", None),
    ("general", "T4stY_cR0u5tY", "o/", None),
    ("general", "KØDΛ", "\o", None),
    ("general", "breizhctf_fan", "quelqu'un a teste l'app mobile ? elle est cool en vrai", None),
    ("general", "rami", "C'est quoi le delire ça sert a quoi une caté android en ctf ?", None),
    ("general", "admin", "Utilisez l'IA intelligemment !", None),
    ("general", "Rebecca", "Qui a déjà maté cyberpunk edgerunner?", None),
    ("general", "admin", "I swear it's a feature, not a bug ;)", None),
    ("general", "22_bossman", "gm", None),
    ("general", "pwnii", "woow qui s'occupe de l'infra du CTF ?! c'est du lourd", None),
    ("general", "Make-Breakcore-Great-Again", "C'est pas de la breakcore c'est de la DnB..", None),
    ("general", "T4stY_cR0u5tY", "le crackme 3 c'est du ollvm, faut juste deobfusquer le CFG", None),
    ("general", "Make-Breakcore-Great-Again", "merci captain obvious", None),
    ("general", "rami", "qqun a vrmnt regardé le chall mobile ?", None),
    ("general", "KØDΛ", "celui avec l'app messenger ? j'ai regarde un peu", None),
    ("general", "rami", "ouais celui-la, j'arrive a me log mais je bloque apres", None),
    ("general", "KØDΛ", "y'a un truc louche..", None),
    # -- 30 above = INITIAL_COUNT, rest trickle in --
    ("general", "Rebecca", "no spoil svp", None),
    ("general", "pwnii", "( ˶ˆᗜˆ˵ )", None),
    ("general", "T4stY_cR0u5tY", "KØDΛ 2eme au scoreboard, pas mal", None),
    ("general", "KØDΛ", "je suis la pour le fun :p", None),
    ("general", "breizhctf_fan", "leeeeeet's gooo", None),
    ("general", "22_bossman", "combien de flags vous avez ? moi j'en suis a 22", None),
    ("general", "T4stY_cR0u5tY", "14 ici, il me manque le mobile et 2 pwn", None),
    ("general", "pwnii", "vous imaginez comment le futur de la recherche offensive ? perso l'IA me fait un peu flipper", None),
    ("general", "Rebecca", "interessant... faudrait reverse l'app", None),
    ("general", "rami", "j'ai desassemble le .so, y'a des trucs bizarres dedans", None),
    ("general", "KØDΛ", "genre quoi ?", None),
    ("general", "rami", "je dis rien, no spoil ;)", None),
    ("general", "breizhctf_fan", "qqun veut une galette saucisse ? :)", None),
    ("general", "T4stY_cR0u5tY", "Grave j'ai faim", None),
    ("general", "Make-Breakcore-Great-Again", "je crois que j'ai trouve un truc sur le chall stegano", None),
    ("general", "22_bossman", "Le web est vraiment bien GG ;)", None),
    ("general", "pwnii", "c'est moi ou l'app mobile a un truc chelou ?", None),
    ("general", "Rebecca", "we were having a moment!", "rebecca.jpg"),
    ("general", "KØDΛ", "y'a un truc <SPOILER>, c'est louche pour une app de chat", None),
    ("general", "rami", "rami malek c'est tellement le meilleur acteur les gars", "rami.jpg"),
    ("general", "T4stY_cR0u5tY", "bon je vais dormir, a demain", None),
    ("general", "breizhctf_fan", "bonne nuit !", None),
    ("general", "pwnii", "vous trouvez pas qu'il est trop mignon le petit perso claude", "claude.gif"),
    ("general", "Make-Breakcore-Great-Again", "gg a tous ceux qui ont flag", None),
    # -- more flag-submission (trickle) --
    ("flag-submission", "KØDΛ", "BZHCTF{0s1n7_1s_fun}", None),
    ("flag-submission", "bot", "Invalid flag. Try again!", None),
    ("flag-submission", "KØDΛ", "mince..", None),
    ("flag-submission", "KØDΛ", "BZHCTF{r3v3rs3_1s_n0t_th4t_h4rd}", None),
    ("flag-submission", "bot", "Flag correct ! Challenge: Osint 1 - GG @KØDΛ", None),
    ("flag-submission", "22_bossman", "BZHCTF{k3rn3l_p4n1c_f0r_fun}", None),
    ("flag-submission", "bot", "Flag correct ! Challenge: Kernel Panic - GG @22_bossman", None),
    ("flag-submission", "pwnii", "BZHCTF{f1rst_pwn_3v3r}", None),
    ("flag-submission", "bot", "Flag correct ! Challenge: Baby PWN - GG @pwnii", None),
    ("flag-submission", "pwnii", "le chall est pété ??", None),
    ("flag-submission", "music_lover42", "BZHCTF{st3g4n0_1n_th3_b34t}", None),
    ("flag-submission", "bot", "Flag correct ! Challenge: Hidden Track - GG @music_lover42", None),
]


def _make_fallback_png(w=100, h=100, r=50, g=50, b=50):
    import struct, zlib

    def _chunk(ctype, data):
        c = ctype + data
        crc = struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
        return struct.pack(">I", len(data)) + c + crc

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = _chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
    raw = b""
    for _ in range(h):
        raw += b"\x00" + bytes([r, g, b]) * w
    return sig + ihdr + _chunk(b"IDAT", zlib.compress(raw)) + _chunk(b"IEND", b"")


def _create_seed_images(upload_dir):
    _base = os.path.dirname(os.path.abspath(__file__))
    _seed_dir = os.path.join(_base, "seed_images")

    imgs = {}
    for name in SEED_IMAGES:
        local_path = os.path.join(_seed_dir, name)
        if os.path.exists(local_path):
            with open(local_path, "rb") as f:
                data = f.read()
        else:
            data = _make_fallback_png(r=random.randint(0,255), g=random.randint(0,255), b=random.randint(0,255))
        fhash = hashlib.sha256(data).hexdigest()[:16]
        fpath = os.path.join(upload_dir, fhash)
        if not os.path.exists(fpath):
            with open(fpath, "wb") as f:
                f.write(data)
        imgs[name] = fhash
    return imgs


INITIAL_COUNT = 30


def seed_messages(conn, upload_dir):
    pass


def start_ambient_chat(db_path, upload_dir):
    def _worker():
        conn = sqlite3.connect(db_path)
        count = conn.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
        conn.close()
        if count > 0:
            return

        imgs = _create_seed_images(upload_dir)
        conn = sqlite3.connect(db_path)
        for name, fhash in imgs.items():
            conn.execute(
                "INSERT OR IGNORE INTO attachments (hash, original_name, mime_type, size, created_at) VALUES (?, ?, ?, ?, ?)",
                (fhash, name, "image/png", 1024, time.time()),
            )
        conn.commit()
        conn.close()

        now = time.time()
        for i, (channel, user, content, img_key) in enumerate(AMBIENT_MESSAGES):
            if i >= INITIAL_COUNT:
                time.sleep(random.uniform(30, 90))
            att_hash = imgs.get(img_key) if img_key else None
            att_name = img_key if img_key else None
            ts = now - (INITIAL_COUNT - i) * 120 if i < INITIAL_COUNT else time.time()
            try:
                conn = sqlite3.connect(db_path)
                conn.execute(
                    "INSERT INTO messages (id, channel_id, username, content, attachment_hash, attachment_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (str(uuid.uuid4()), channel, user, content, att_hash, att_name, ts),
                )
                conn.commit()
                conn.close()
            except Exception:
                pass

    t = threading.Thread(target=_worker, daemon=True)
    t.start()
