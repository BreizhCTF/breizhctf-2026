# Writeup , Daft Club

Valid CD key: `DAFT-J57BB-I7E6W-N3ACM`
AES key (flag): `BZHCTF{9fc162d13d99a742ab4780170af035a3}`

# Daft Club , BreizhCTF 2026

**Catégorie :** Reverse | **Difficulté :** Difficile | **Points :** 500  
**Flag :** `BZHCTF{9fc162d13d99a742ab4780170af035a3}`

---

Le challenge propose un faux site de musique années 2000 où il faut entrer un code CD pour débloquer une piste des Daft Punk. Le validator est un binaire CGI qui implémente un whitebox AES-128 (Chow et al., variante à encodage linéaire). La clé n'est pas dans le binaire , elle est encodée dans ~364 Ko de tables de lookup. Le flag c'est la clé AES en hex.

```
nginx → POST /redeem → fcgiwrap → validator (CGI)
                                      └── whitebox AES-128
```

---

## Comprendre le whitebox

### AES round 0 en deux mots

AES-128 fait 10 tours. Le premier (round 0) c'est : AddRoundKey → SubBytes → ShiftRows → MixColumns.

ShiftRows redistribue les octets du plaintext dans les colonnes de l'état. Après ShiftRows, la colonne `c` reçoit les octets de plaintext aux positions `COL_INPUTS[c]` (ce sont les diagonales de la grille 4×4). MixColumns mélange ensuite les 4 octets de chaque colonne via la matrice :

```
M = [[2,3,1,1], [1,2,3,1], [1,1,2,3], [3,1,1,2]]   sur GF(2⁸)
```

Donc la sortie d'une colonne c'est une combinaison linéaire (dans GF(2⁸)) des quatre valeurs `SBox(pt[b] ^ K[b])`  une par octet d'entrée de la colonne. Chaque `SBox(pt[b] ^ K[b])` ne dépend que d'un seul octet de clé, mais tout se mélange dans MixColumns.

### Comment Chow encode ça

Chow décompose MixColumns avec les tables Tyi : pour l'octet `b` qui alimente la ligne `r` de sa colonne, sa contribution 32 bits est :

```
Tyi[r](s) = (c₀·s, c₁·s, c₂·s, c₃·s)   avec s = SBox(pt[b] ^ K[b])
```

Les `cᵢ` sont les coefficients MixColumns de la ligne `r`. La sortie de colonne complète est juste le XOR des 4 mots Tyi. Logique.

Mais les tables ne sont pas stockées en clair  ce qu'on trouve dans le binaire c'est :

```
wb_tyi[b][v] = L_b( Tyi[r]( SBox(v ^ K[b]) ) )
```

`L_b` est une application linéaire sur GF(2)³² qui mélange les 4 octets du mot Tyi. Entre les tours, des tables XOR encodées annulent ces encodages pour que la composition reste un AES correct. C'est la "variante à encodage linéaire" mentionnée dans le README.

### Pourquoi on ne peut pas attaquer l'état intermédiaire

Première idée naturelle : capturer les 16 octets d'état en sortie du round 0 et faire une attaque par collision dessus. Ça ne marche pas.

Le problème : `L_b` mélange les 4 octets du mot Tyi. Donc chaque octet de l'état observable après le round 0 est une combinaison linéaire des **quatre** valeurs `SBox(pt[bⱼ] ^ K[bⱼ])` de la colonne. C'est plus une fonction d'un ou deux octets d'entrée , une collision sur cet état ne dit rien d'utile sur la clé.

Le seul endroit où la relation "un octet d'entrée ↔ une valeur observable" survit, c'est **l'adresse de lecture de la table** : pour lire `wb_tyi[b][pt[b] ^ K[b]]`, le CPU calcule `base_b + 4 * (pt[b] ^ K[b])`. L'adresse encode directement `pt[b] ^ K[b]`, avant tout encodage. C'est le point d'attaque.

---

## La solution : DCA sur les lectures Tyi

### Trouver les adresses de base

On instrumente le binaire avec PyQBDI (cf. `make_lib.py` + `instrument.py` pour l'extraction et le setup de la VM). L'idée pour localiser les 16 tables `tyi_tab[0][b]` :

- Run 1 : `pt = [0]*16` → la lookup pour l'octet `b` lit à l'adresse `base_b`
- Run 2 : `pt = [1]*16` → elle lit à `base_b + 4`

On parcourt les deux flux de lectures 4 octets en parallèle au même RVA. Dès qu'on voit deux lectures au même endroit du code dont les adresses diffèrent de 4, c'est une lookup Tyi. On vérifie ensuite que pour `pt = [v]*16` l'adresse est bien `base_b + 4*v`. Les 16 bases sont trouvées en deux runs.

### Ce qu'on observe

Pour chaque trace, on capture la valeur 32 bits retournée par chaque lookup Tyi. Ce mot est :

```
w_b = enc₀(g₀(s)) | enc₁(g₁(s))<<4 | … | enc₇(g₇(s))<<28
```

avec `s = SBox(pt[b] ^ K[b])`. Les `encₚ` sont des bijections inconnues sur 4 bits. Les `gₚ(s)` sont les quartets du mot `Tyi[r](s)` , des fonctions connues de `s` dans GF(2⁸) (multiplications par 1, 2, 3 selon la ligne).

### L'astuce des partitions

`encₚ` est une bijection, donc deux traces ont le même quartet observé en position `p` si et seulement si elles ont la même valeur `gₚ(s)`. Ça veut dire que la partition de l'ensemble de traces selon le quartet observé `p` est exactement la même que la partition selon `gₚ(SBox(pt[b] ^ K[b]))` , sans connaître `encₚ`.

On compare des partitions, pas des valeurs absolues. Pour représenter une partition on réétiquette par ordre d'apparition :

```
[3, 7, 3, 7, 4] → (0, 1, 0, 1, 2)
```

Deux listes avec la même structure de classes d'équivalence donnent le même tuple.

### Récupération de la clé

Avec 64 plaintexts aléatoires et leurs mots Tyi capturés, pour chaque octet `b` :

1. Calculer les 8 partitions observées `obs_part[p]` depuis les quartets de `w_b`.

2. Pour chaque candidat `k ∈ [0, 255]` : calculer `s_i = SBox(pt_i[b] ^ k)`, en déduire les 8 partitions prédites depuis `tyi_nibbles(s_i, b)`, et compter combien de partitions observées matchent une partition prédite. C'est le score.

3. La vraie clé `K[b]` score 8/8. Les fausses clés scorent moins , elles produisent une permutation différente des valeurs `s_i`, donc des partitions différentes.

256 candidats × 16 octets = 4096 tests, pas de boucle en 256². Ça tourne en ~30 secondes.

---

## Résultat

```
$ python dca_tyi.py
[*] Locating tyi_tab[0] base addresses …
[*] Capturing tyi outputs for 64 random plaintexts …
[*] Recovering key bytes …
    byte  0: top candidates [('0x9f', 8), ...]
    ...
[+] Recovered: 9fc162d13d99a742ab4780170af035a3
[+] MATCH
```

**Flag :** `BZHCTF{9fc162d13d99a742ab4780170af035a3}`
