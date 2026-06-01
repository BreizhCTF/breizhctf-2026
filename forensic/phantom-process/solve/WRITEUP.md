# Phantom Process - Writeup

Supply chain via pip typosquat > implant fileless `memfd_create` > masquerading kworker > exfil XOR machine-id > flag.

## 1 - Bash history

```
$ vol -f evidence.lime -s . linux.bash
15335  bash  2026-05-11 20:51:xx  sudo pip install rasterio-tools --break-system-packages
```

`rasterio-tools` n'existe pas, typosquat de `rasterio`.

## 2 - Faux miroir PyPI

```
$ strings evidence.lime | grep "index-url"
index-url = https://pypi-cdn.survey-tools.eu/simple/
```

## 3 - Package malveillant dans le pagecache

```
$ vol -f evidence.lime -s . linux.pagecache.Files --find rasterio
[...]
/usr/local/lib/python3.11/dist-packages/rasterio_tools/_native_check.py
/usr/local/lib/python3.11/dist-packages/rasterio_tools/__init__.py
```

Dump du fichier :

```
$ vol -f evidence.lime -s . linux.pagecache.InodePages \
    --find "/usr/local/lib/python3.11/dist-packages/rasterio_tools/_native_check.py" --dump
```

Le code dans `_native_check.py` : telecharge un ELF > `memfd_create("native_ext")` > `execve("/proc/self/fd/N")`. Fileless.

## 4 - Faux kworker

```
$ vol -f evidence.lime -s . linux.pstree | grep kworker
* 0x...  8445  8445  1  kworker/u8:2
* 0x...  8447  8447  1  kworker/u8:2
* 0x...  7     7     2  kworker/0:0
```

8445/8447 ont PPID=1. Les vrais kworkers ont PPID=2 (kthreadd). Et `u8` n'existe pas sur cette VM (3 CPUs, max u6).

## 5 - Extraction du binaire

```
$ vol -f evidence.lime -s . linux.elfs --pid 8445 --dump
8445  kworker/u8:2  0x55d19b520000  /memfd:native_ext (deleted)  pid.8445.kworker_u8:2.0x55d19b520000.dmp
```

On recupere le ELF complet de l'implant.

## 6 - Reverse de l'implant

On ouvre `pid.8445.kworker_u8:2.0x55d19b520000.dmp` dans IDA.

![IDA decompilation](ida_xor_logic.png)

Deux choses sautent aux yeux dans le pseudocode :

**1) Lecture de `/etc/machine-id` :**

```c
if ( (int)sub_1E00("/etc/machine-id", v78) <= 31 )
```

`sub_1E00` lit le fichier dans `v78`. Le machine-id fait 32 hex chars, il sert de cle.

**2) Boucle XOR sur les donnees :**

```c
v9 = &aUsrLibPython3D_3[24];
v10 = &xmmword_104A40;
do
{
  *v9++ ^= *(_BYTE *)v10;
  v10 = (__int128 *)((char *)v10 + 1);
}
while ( v9 != &aUsrLibPython3D_3[46] );
```

XOR byte a byte entre les donnees lues et le contenu de `v78` (machine-id). Plus loin on retrouve des operations SSE (`_mm_xor_si128`) qui font le meme XOR en batch sur des blocs de 16 bytes.

En cherchant les strings on trouve aussi :
- `telemetry.bas-infra.fr/api/v1/telemetry/report` (URL d'exfil)
- `ubuntu-report/1.4.1` (User-Agent deguise en telemetrie Ubuntu)
- `hw_metrics` (champ JSON contenant les donnees volees)
- Des refs vers `~/.ssh/id_ed25519`, `~/.pgpass` (fichiers exfiltres)

Conclusion : le binaire lit des fichiers sensibles, XOR chaque fichier avec machine-id, hex-encode le resultat, et POST le tout dans un champ `hw_metrics` avec `|` comme separateur.

## 7 - Donnees exfiltrees et machine-id

On sait grace au reverse que les donnees sont XOR avec `/etc/machine-id` puis hex-encodees dans `hw_metrics`. On cherche directement dans le dump brut :

```
$ grep -aoP '"hw_metrics":"[0-9a-f|]+"' evidence.lime
"hw_metrics":"4c4b4814497224752828...433b"
```

Le blob contient trois parties separees par `|`.

Pour le machine-id, strings sur le ELF dump :

```
$ strings pid.8445.kworker_u8:2.0x55d19b520000.dmp | grep -oP '^[0-9a-f]{32}$'
afe9d0a2af3f405bb130144226865022
```

## 9 - Decode

On a tout : le blob hex `hw_metrics`, la cle `afe9d0a2af3f405bb130144226865022`, la logique XOR byte a byte avec wrap sur 32 chars.

```python
machine_id = "afe9d0a2af3f405bb130144226865022"
for part in blob.split("|"):
    raw = bytes.fromhex(part)
    print(bytes(b ^ ord(machine_id[j % 32]) for j, b in enumerate(raw)).decode())
```

```
--- Part 0 ---
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAAB...
-----END OPENSSH PRIVATE KEY-----

--- Part 1 ---
BZHCTF{ph4nt0m_pr0c3ss_m3mfd_cr34t3}

--- Part 2 ---
ops-srv01:5432:flight_data:bas_operator:BAS_fl1ght_2026!
```

## Flag

```
BZHCTF{ph4nt0m_pr0c3ss_m3mfd_cr34t3}
```
