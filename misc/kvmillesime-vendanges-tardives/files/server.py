#!/usr/bin/env python3
from pwn import *
import platform
import time
import os
import json
from pwn import subprocess

FLAG = os.getenv("FLAG", "BZHCTF{FAKE_FLAG}")

# --- Configuration ---
context.log_level = 'warning'

KERNEL = "build/small_vmlinuz"
INITRD = "build/rootfs.cpio"
SNAP_DISK = "/tmp/snap.qcow2"
BIN_QEMU_IMG = "build/qemu-img"
BIN_QEMU = "build/qemu-system"
BIOS_FOLDER = "build/pc-bios"

LOCALHOST = "127.0.0.1"
QMP_PORT = 4444
CONSOLE_PORT = 5555
MAX_SNAPSHOT = 3
UART_PATH = "ttyS0"

def start_qemu():
    if not os.path.exists(SNAP_DISK):
        subprocess.run([BIN_QEMU_IMG, "create", "-f", "qcow2", SNAP_DISK, "128M"], 
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    cmd = [
        BIN_QEMU,
        "-L", BIOS_FOLDER,
        "-device", "pci-rng-ascending",
        "-qmp", f"tcp:127.0.0.1:{QMP_PORT},server,nowait",     
        "-serial", f"tcp:127.0.0.1:{CONSOLE_PORT},server,nowait", 
        "-nographic",
        "-kernel", KERNEL,
        "-initrd", INITRD,
        "-drive", f"if=none,format=qcow2,file={SNAP_DISK},id=snapdisk",
        "-device", "virtio-blk-pci,drive=snapdisk",
        "-snapshot",
        "-object", "rng-random,id=rng0,filename=/dev/urandom",
        "-device", "virtio-rng-pci,rng=rng0",
        "-m", "128",
        "-append", f"console={UART_PATH} quiet",
        "-net", 'none',
        "-vga", "none"
    ]
    
    p = process(cmd, stderr=subprocess.STDOUT) 
    return p

def connect_services():
    time.sleep(1)  

    try:
        qmp = remote(LOCALHOST, QMP_PORT, timeout=5)
        qmp.recvuntil(b"QMP") 
        qmp.sendline(b'{"execute": "qmp_capabilities"}')
        qmp.recvuntil(b"return")
        qmp.clean()

        console = remote(LOCALHOST, CONSOLE_PORT, timeout=5)
    except Exception as e:
        return None, None
    
    return qmp, console

def main():
    qemu_proc = start_qemu()

    # [DEBUG] START: Capture QEMU output on connection failure
    try:
        qmp, console = connect_services()
    except Exception as e:
        log.warning(f"Failed to connect to QEMU services. QEMU exit code: {qemu_proc.poll()}")
        if qemu_proc.poll() is not None:
            print("--- QEMU STDOUT/STDERR ---")
            print(qemu_proc.clean().decode(errors='replace'))
            print("--------------------------")
        qemu_proc.kill()
        raise e
    # [DEBUG] END

    if not qmp or not console:
        qemu_proc.kill()
        return

    # Synchronized Handshake
    while True:
        try:
            console.sendline(b"PING")
            line = console.recvline(timeout=2)
            if b"PING" in line: # Consume echo
                line = console.recvline(timeout=2)
            if b"PONG" in line:
                break
        except Exception:
            pass
        time.sleep(1)

    console.clean()

    print("\n=== BIENVENUE SUR L'ORACLE DE VINCE-HEX ===\n(Interface spirituelle fournie par PranaCorp)\n")

    nb_snapshot = 0

    while True:
        print("\n[1] listen_to_oracle()                  - Écouter les vibrations quantiques\n[2] meditate_on_state()                 - Ancrer votre karma dans la blockchain\n[3] revisit_past_life()                 - Rembobiner l'univers\n[4] manifest_destiny()                  - Aligner vos chakras pour gagner le gros lot\n[5] withdraw_spiritual_dividends()      - S'élever spirituellement\n\nVotre choix, jeune novice :")
        
        try:
            choice = input("> ").strip()
        except EOFError:
            break

        if choice == "1":
            console.sendline(b'GET')
            console.recvline()  # Skip the echoed 'GET'
            res = console.recvline().strip().decode()
            print(f"Vibration: {res}")
        elif choice == "2":
            if nb_snapshot >= MAX_SNAPSHOT:
                print("Karma saturé.")
                continue
            tag = f"snap_{nb_snapshot}"
            cmd = {"execute": "human-monitor-command", "arguments": {"command-line": f"savevm {tag}"}}
            print(f"Ancrage du karma sur le slot {nb_snapshot}")
            qmp.sendline(json.dumps(cmd).encode())
            qmp.recvuntil(b"return")
            qmp.clean()
            nb_snapshot += 1
        elif choice == "3":
            try:
                tag_id = int(input("Identifiant de vie : ").strip())
            except ValueError:
                continue
            if tag_id < 0 or tag_id >= nb_snapshot: 
                print("Cette vie n'existe pas.")
                continue
            tag = f"snap_{tag_id}"
            cmd = {"execute": "human-monitor-command", "arguments": {"command-line": f"loadvm {tag}"}}
            print(f"Rembobinage vers la vie #{tag_id}")
            qmp.sendline(json.dumps(cmd).encode())
            qmp.recvuntil(b"return")
            qmp.clean()
            console.clean()
        elif choice == "4":
            user_guess = input("Votre prédiction (hex) : ")
            console.sendline(b"GUESS")
            console.recvline() # Consume echoed "GUESS"
            console.sendline(user_guess[:16].encode('ascii'))
            console.recvline() # Consume echoed user guess

            while True:
                line = console.recvline().strip().decode()
                if "USER_AUTHENTIFIED" in line:
                    print(f"Illumination atteinte ! Voici votre récompense : {FLAG}")
                    break
                elif "FAIL" in line:
                    print("Votre chakra est désaligné.")
                    break
        elif choice == "5":
            print("Vous vous élevez spirituellement et réalisez la vacuité des possessions matérielles...")
            break
        else:
            log.warning("Tout vient à point à qui sait attendre.")

    qemu_proc.kill()
    qmp.close()
    console.close()

if __name__ == "__main__":
    main()
