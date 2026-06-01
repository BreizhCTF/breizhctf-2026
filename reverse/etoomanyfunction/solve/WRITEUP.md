# WRITEUP — ETOOMANYFUNCTION

**Flag:** `BZHCTF{100k_func_aint_too_many_4_u}`

---

## Conception du challenge

Le binaire contient 100 000 functions (`f00000`..`f99999`).

- Une function (**gate**) lit stdin et appelle `strcmp` avec le mot de passe `BREIZHCTF`.
  En cas de match, elle incrémente `unlock_acc` de `0xDEAD`.
- 35 functions (**flag writers**) assignent chacune un octet à `fbuf[]`.
- 40 functions (**acc noise**) s'annulent mutuellement (paires `+X / -X`), ce qui brouille l'analyse des xref.
- Le reste est du bruit pure qui opère sur `buf[]`.

`main` appelle toutes les functions dans l'ordre via 10 batch helpers.
Si `unlock_acc == 0xDEAD` après tous les appels, la flag est affichée.

---

## Chemins de résolution

### Path 1 — Static string search (30 secondes)

Le mot de passe `BREIZHCTF` est stocké comme plain string dans `.rodata` :

```bash
strings ./etoomanyfunction | grep BREIZH
```

Puis exécuter le binaire avec cette entrée :

```bash
echo "BREIZHCTF" | ./etoomanyfunction
# Flag: BZHCTF{100k_func_aint_too_many_4_u}
```

### Path 2 — Dynamic tracing (2 minutes)

Utiliser `ltrace` ou `gdb` pour intercepter l'appel à `strcmp` et lire directement ses arguments,
ou simplement break sur `printf` et lire l'argument de format.

### Path 3 — Full static reverse (10–15 minutes)

1. Ouvrir dans Ghidra/IDA. `main` est minuscule : une série d'appels à `batch_XX()`.
2. Chercher les xrefs vers l'import `strcmp` : exactement une function l'appelle (la gate).
3. Lire son argument → password = `BREIZHCTF`.
4. Chercher les écritures vers le second global buffer (`fbuf`) : 35 functions font `fbuf[N] = K`.
5. Trier par slot index, collecter les octets → flag.

---

## Exécution du solver

```bash
python3 solve/solve.py
```

Le script exécute les trois chemins et affiche la flag.
