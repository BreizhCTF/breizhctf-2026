# WU - Ledger Breizh App (Reverse / Medium)

## Contexte

Le challenge expose une application Ledger executee dans Speculos (instance distante).
Objectif: retrouver la sequence exacte d'APDUs qui fait avancer la machine a etats
et declenche l'affichage du flag.

## Analyse rapide

Après ouverture sous Ghidra, on identifie dans le binaire le CLA attendu: `0xE0`.
Le dispatcher redirige vers un handler de machine a etats base sur une globale `sm_state`.

Les INS interessants sont:

- `0x10` INIT
- `0x11` KEY
- `0x12` CONFIG
- `0x13` VERIFY
- `0x14` ARM
- `0x20` FLAG

Un `0xFF` existe aussi (`SET_FLAG`) mais il sert a l'infra pour injecter le flag.

La machine a etats (variable `sm_state` doit progresser proprement: `0 -> 1 -> 2 -> 3 -> 4 -> 5`.
Une erreur a n'importe quelle etape reset `sm_state` a `0`.

## Etape 1 - INIT (`INS=0x10`)

Condition trouvee:

```c
check = (p1 ^ 0x42) + (p2 ^ 0x5A);
```

Pour que `check == 0`, il faut `P1=0x42` et `P2=0x5A`.

APDU:

`E0 10 42 5A 00`

## Etape 2 - KEY (`INS=0x11`)

Le handler lit 8 octets de donnees, applique un XOR avec une cle,
puis compare au tableau attendu avec des styles de comparaisons différents (XOR, soustraction, complément...).

Valeurs extraites:

```text
XOR_KEY  = 42 52 45 49 5A 48 21 21
EXPECTED = 01 20 76 39 69 3B 63 7B
```

On reconstruit l'entree:

`data[i] = EXPECTED[i] ^ XOR_KEY[i]`

Ce qui donne `43 72 33 70 33 73 42 5A` (`Cr3p3sBZ`).

APDU:

`E0 11 01 00 08 437233703373425A`

## Etape 3 - CONFIG (`INS=0x12`)

Condition principale:

`P1 * P2 == 0x15`

Donc n'importe quelle paire dont le produit vaut `21` fonctionne.
Choix simple: `P1=0x03`, `P2=0x07`.

Le gros switch vu en desassemblage sur P1 est de l'obfuscation : toutes les branches calculent le même produit.
Le handler verifie aussi que l'etape KEY n'a pas ete remplie avec des zeros (`accum[0] ^ accum[1] != 0`).

APDU:

`E0 12 03 07 00`

## Etape 4 - VERIFY (`INS=0x13`)

Le code applique une S-box nibble-a-nibble 4 bits (16 entrées) et attend la sortie:

`B4 E1 7C 2D`

Il faut donc inverser la S-box pour calculer l'entree correspondante.

```python
inv = [0] * 16
for i in range(16):
    inv[sbox[i]] = i

inp = []
for b in [0xB4, 0xE1, 0x7C, 0x2D]:
    inp.append((inv[b >> 4] << 4) | inv[b & 0xF])
```

Entree obtenue:

`61 03 FB 42`

APDU:

`E0 13 00 00 04 6103FB42`

## Etape 5 - ARM (`INS=0x14`)

Condition:

`(P1 << 8) | P2 == 0x1337`

Le binaire reconstruit `0x1337` via des shifts `(0x26 >> 1) << 8 | (0x6E >> 1)` pour cacher la constante,
mais le check final est direct.

APDU:

`E0 14 13 37 00`

## Etape 6 - FLAG (`INS=0x20`)

Pas de data à envoyer. Si l'etat courant vaut bien `5`, l'application affiche le flag sur l'écran.

APDU:

`E0 20 00 00 00`

## Récap

```
E0 10 42 5A 00
E0 11 01 00 08 437233703373425A
E0 12 03 07 00
E0 13 00 00 04 6103FB42
E0 14 13 37 00
E0 20 00 00 00
```

## Execution avec le solve

Le solve envoie simplement les APDUs sur l'API HTTP (`POST /apdu`).

Afficher uniquement la sequence (sans envoi):

```bash
python3 solve.py --dry-run
```

Envoyer vers une instance distante:

```bash
python3 solve.py --url http://host:5000
```

`BZHCTF{l3dg3r_4pdu_m4st3r_bzh!}`

## Notes infra

Le flag est injecte au demarrage via `SET_FLAG` (`INS=0xFF`) avec un mecanisme
crypto (HMAC/AES) cote infrastructure.
Sans cette injection, l'ecran affiche un message de type "Pas de flag !".
