# Phantom Process

- **Auteur** : [Lamarr](#)
- **Catégorie** : Forensic
- **Difficulté** : Moyen

## Description

Analyse d'un dump mémoire LiME d'un serveur Linux compromis. Le joueur doit retrouver
le vecteur d'infection (supply chain via pip), identifier un implant fileless
(`memfd_create`), et extraire le flag depuis les données exfiltrées en mémoire.

## Fichiers fournis aux joueurs

- `evidence.lime` — dump mémoire LiME (~4 Go, git LFS)
- `debian-6.1.0-44.json` — profil Volatility3 (ISF)

## Flag

`BZHCTF{ph4nt0m_pr0c3ss_m3mfd_cr34t3}`

## Solve path

1. `linux.bash` → `sudo pip install rasterio-tools --break-system-packages`
2. `linux.pagecache.Files` → `_native_check.py` : `memfd_create` + `execve` fileless
3. `linux.pstree` → `kworker/u8:2` avec PPID=1 (devrait être 2)
4. `linux.elfs --pid 8445 --dump` → dump le ELF de l'implant
5. Reverse IDA/Ghidra → XOR avec machine-id, exfil `hw_metrics`
6. `strings` sur le ELF dumpé → machine-id
7. `grep hw_metrics evidence.lime` → blob hex exfiltré
8. hex-decode les parties séparées par `|`, XOR avec machine-id → flag
