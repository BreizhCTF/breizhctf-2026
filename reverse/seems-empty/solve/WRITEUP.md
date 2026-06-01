# Seems Empty - Writeup

## Informations

- **Catégorie** : Reverse
- **Difficulté** : Très Facile
- **Auteur** : AntwortEinesLebens

## Énoncé

Lors d'un audit, un fichier Python compilé a été rapidement classé comme sans
intérêt.

Son comportement paraissait parfaitement anodin : aucun accès réseau, aucune
écriture suspecte, juste un message banal affiché à l'écran.

Relégué parmi les artefacts mineurs, il semble pourtant avoir été altéré pour
dissimuler quelque chose dans ce qui ressemble à une simple chaîne de
caractères.

Même ce qui semble vide peut cacher un secret.

**Fichiers fournis :**

- `seems-empty.pyc`

## Résumé

Le challenge repose sur un fichier `.pyc` qui semble ne contenir qu'un message
anodin. En le décompilant, on retrouve cependant une chaîne avec des caractères
Unicode invisibles ainsi qu'une docstring qui indique l'utilisation de
`StegCloak` et du mot de passe `empty`.

## Analyse initiale

### Identification du fichier

La première chose à faire est d'identifier ce qui nous est fourni. Ici, nous
avons un fichier Python compilé, donc un bytecode `.pyc`.

```bash
$ file seems-empty.pyc
seems-empty.pyc: Byte-compiled Python module for CPython 3.13 (magic: 3571)
```

On sait donc déjà que la bonne piste n'est pas l'exécution brute du fichier,
mais sa décompilation ou son inspection.

### Exécution du fichier

Pour avoir une idée de ce que fait le programme, on peut l'exécuter avec une
version compatible de Python, ici Python 3.13 puisque c'est la version ciblée
par le bytecode.

```bash
$ python3.13 seems-empty.pyc
There's nothing to see here...
```

Le programme ne fait donc qu'afficher un message parfaitement banal avant de se
terminer. Il n'y a pas d'interaction, pas d'erreur, pas de comportement
suspect : tout est fait pour donner l'impression qu'il n'y a rien à analyser.

### Strings

Avant même de décompiler, on peut aussi regarder les chaînes de caractères
présentes dans le fichier :

```bash
$ strings seems-empty.pyc
There's nothing
to see here...
J'ai planque
 la charge dans les caracteres invisibles.
...
StegCloak.
2. Utiliser "empty" comme mot de passe.
...
main.py
get_secret
main
__main__
```

Cette sortie montre déjà plusieurs éléments utiles :

- le faux message `There's nothing to to see here...`
- une référence à `StegCloak`
- le mot de passe `empty`

En revanche, la chaîne apparaît ici coupée en deux alors qu'à l'exécution elle
semble n'en former qu'une seule. Ce décalage est déjà un indice intéressant :
quelque chose se trouve probablement entre les deux morceaux. On comprend donc
que `strings` donne une bonne piste, mais qu'il faudra quand même passer par
une décompilation pour récupérer le contenu proprement.

## Analyse statique

### Décompilation du `.pyc`

On peut ensuite décompiler le fichier avec l'outil de son choix. Dans notre
cas, nous allons utiliser [PyLingual](https://pylingual.io), qui donne souvent
de très bons résultats. En contrepartie, il peut être un peu
lent, car il s'appuie sur des modèles `transformers` pour une partie de sa
pipeline de décompilation.

```bash
$ pylingual seems-empty.pyc
...
[15:25:48] INFO     Loading seems-empty.pyc...
[15:25:48] INFO     Detected version as 3.13
[15:25:48] INFO     Loading models for 3.13...
[15:26:12] WARNING  Using CPU for models
[15:26:40] INFO     Decompiling pyc seems-empty.pyc to decompiled_seems-empty.py
[15:26:40] INFO     Masking bytecode for seems-empty.pyc...
[15:26:40] INFO     Segmenting bytecode for seems-empty.pyc...
[15:26:42] INFO     Translating statements for seems-empty.pyc...
[15:26:58] INFO     Unmasking lines for seems-empty.pyc...
[15:26:58] INFO     Reconstructing control flow for seems-empty.pyc...
[15:26:58] INFO     Reconstructing source for seems-empty.pyc...
[15:26:58] INFO     Checking decompilation for seems-empty.pyc...
[15:26:58] INFO     Decompilation complete
[15:26:58] INFO     100.00% code object success rate
[15:26:58] INFO     Result saved to decompiled_seems-empty.py

Equivalence Results for seems-empty.pyc
+---------------------+---------+---------+
| Code Object         | Success | Message |
+---------------------+---------+---------+
| <module>            | Success | Equal   |
| <module>.get_secret | Success | Equal   |
| <module>.main       | Success | Equal   |
+---------------------+---------+---------+
```

Une fois la décompilation terminée, nous obtenons un nouveau fichier
`decompiled_seems-empty.py`. Nous pouvons l'afficher pour lire le
résultat :

```bash
$ cat decompiled_seems-empty.py
# Decompiled with PyLingual (https://pylingual.io)
# Internal filename: 'main.py'
# Bytecode version: 3.13.0rc3 (3571)
# Source timestamp: 2026-04-05 12:20:40 UTC (1775391640)

"""Franchement, s\'ils sont assez limités pour s\'arrêter à une phrase aussi vide, tant mieux pour nous.\nOn leur montre trois mots sans intérêt, et ils appelleront ça une analyse."""
message = 'There\'s nothing <20262><8205><8204><8204><8290><8290><8290><8290><8205><8204><8290><8205><8292><8204><8289><8290><8291><8292><8205><8204><8204><8204><8205><8204><8205><8290><8289><8290><8290><8291><8290><8289><8204><8292><8204><8290><8204><8290><8289><8290><8289><8204><8205><8290><8204><8205><8292><8289><8205><8289><8290><8292><8204><8289><8205><8290><8290><8289><8204><8204><8204><8205><8204><8205><8290><8204><8290><8290><8290><8290><8289><8290><8204><8290><8290><8291><8205><8290><8205><8204><8292><8204><8204><8291><8290><8204><8204><8290><8289><8291><8289><8204><8204><8291><8290><8291><8291><8289><8204><8204><8290><8204><8205><8290><8289><8290><8292><8290><8292><8204><8290><8291><8289>to see here...'

def get_secret():
    """J\'ai planqué la charge dans les caractères invisibles.\nVu le niveau habituel en face, ils vont encore conclure que c\'est \"juste une string\".\n\nTODO :\n1. Récupérer le contenu caché avec StegCloak.\n2. Utiliser \"empty\" comme mot de passe.\n3. Extraire le secret sans abîmer le leurre ; il ne faudrait pas les brusquer intellectuellement.\n"""
    return

def main():
    """On affiche ça proprement, et ils pourront croire qu\'ils ont fait le tour."""
    print(message)

if __name__ == '__main__':
    main()
```

Ici, l'élément important est surtout la présence de marqueurs comme
`<20262>`, `<8205>` ou `<8204>` au milieu de `message`. Ce sont des points de
code Unicode invisibles, ce qui confirme que la chaîne n'est pas réellement
vide.

Après décompilation, on retombe sur quelque chose de très court :

- une variable `message`
- une fonction `get_secret()` vide
- une fonction `main()` qui se contente d'afficher le message

À première vue, le code paraît effectivement inutile.

### Lecture du code

En lisant le code de plus près, on remarque surtout deux indices utiles :

- la chaîne `message` ne contient pas seulement du texte visible, elle embarque
  aussi une suite de caractères invisibles entre `There's nothing` et
  `to see here...`
- la docstring de `get_secret()` mentionne explicitement `StegCloak` et le mot
  de passe `empty`

On comprend alors que le message sert de support à une donnée cachée, et que la
docstring donne directement l'outil et le mot de passe à utiliser pour
l'extraire.

Les indices sur `StegCloak` et sur le mot de passe `empty` confirment d'ailleurs
très clairement qu'il y a bien quelque chose de caché dans ce message, et qu'il
ne s'agit pas simplement d'une chaîne étrange sans utilité.

Note : selon le terminal, l'éditeur ou l'outil utilisé, ces caractères peuvent
être soit affichés sous forme de marqueurs (`<20262>`, `<8205>`, etc.), soit
être rendus complètement invisibles. Si rien n'apparaît visuellement entre les
deux morceaux de la chaîne, on peut ouvrir le fichier dans un autre outil, dans
un pseudo-terminal différent, ou simplement s'appuyer sur un autre indice comme
la longueur anormale de `message` ou le fait que `strings` coupe la phrase en
deux.

## Solution

### La chaîne `message`

La variable importante du challenge est la suivante :

```python
message = "There's nothing ... to see here..."
```

Ce qui nous intéresse n'est pas le texte visible, mais les caractères invisibles
insérés au milieu. C'est exactement le type de support utilisé par
`StegCloak`.

Le principe est simple : un texte banal sert de couverture, et le secret est
encodé dans une suite de caractères Unicode non affichés.

### Les indices laissés dans le bytecode

Le second indice se trouve dans la docstring de `get_secret()` :

```python
"""J'ai planqué la charge dans les caractères invisibles.
...
1. Récupérer le contenu caché avec StegCloak.
2. Utiliser "empty" comme mot de passe.
..."""
```

Comme il s'agit d'une docstring et non d'un commentaire Python classique, elle
est conservée dans le bytecode et réapparaît après décompilation.

À ce stade, toute la logique du challenge est identifiée :

- récupérer la chaîne complète `message`
- la passer à `StegCloak`
- utiliser `empty` comme mot de passe

### Extraction avec StegCloak

La résolution peut se faire de deux façons :

- en collant directement la chaîne dans l'interface web de `StegCloak`
- en utilisant la CLI officielle avec `npx stegcloak` ou `pnpx stegcloak`

L'approche CLI est pratique, car elle évite les problèmes de copier-coller de
caractères invisibles selon les outils.

Par exemple, on peut sauvegarder la chaîne dans un fichier puis demander à
`StegCloak` de révéler le secret :

```bash
$ STEGCLOAK_PASSWORD=empty npx --yes stegcloak reveal -f message.txt
```

Dans le dossier `solve`, le script `solve.py` automatise exactement cette étape
en réutilisant la chaîne et le mot de passe trouvés pendant l'analyse.

## Flag

Nous obtenons ce flag `BZHCTF{n07_r3411y_3mp7y}`.
