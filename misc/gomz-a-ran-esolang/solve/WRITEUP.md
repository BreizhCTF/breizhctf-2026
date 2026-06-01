# Gomz a ran Esolang

## Introduction

Ce challenge demande d'ecrire des petits programmes dans RELANG, un esolang base sur:

- une pile (stack)
- des operateurs prefixes/separes par des espaces
- des regex comme type de donnee de premiere classe

Le joueur n'a que la spec `relang.txt`: on se base sur la documentation des operateurs et sur des tests en sandbox.

Point pratique observe en test: certaines expressions peuvent sembler "a l'envers" lors de l'evaluation. C'est normal en esolang stack-based, il faut raisonner en termes de pile et non comme un langage infixe classique.

## Rappel rapide des operateurs utilises

- `$`: lit une entree
- `!`: print
- `+`, `-`, `*`, `%`: operations arithmetiques
- `|`: duplique une valeur N fois (`N valeur |`)
- `@`: map (applique un operateur sur une liste)
- `/`: reduce
- `°`: cast vers int
- `~`: remplacement regex
- `§`: deploy d'une regex en liste de valeurs
- `&`: match regex
- `_`: search regex
- `:`: reverse
- `¤`: acces indexe (get)

## Task 1 - Somme de 2 entiers

Objectif: lire 2 nombres et afficher leur somme.

Payload:

```txt
! + $ $
```

Explication:

1. `$` lit le premier entier.
2. `$` lit le second.
3. `+` additionne les deux valeurs.
4. `!` affiche le resultat.

## Task 2 - Somme de X entiers

Objectif: lire `X`, puis lire `X` entiers, et afficher leur somme.

Payload:

```txt
! / + @ $ | $ 0
```

Idee:

1. `$` lit `X`.
2. `0` est la valeur de base.
3. `|` fabrique une liste de taille `X` remplie de `0`.
4. `@ $` mappe l'operateur input sur cette liste: chaque element "0" est remplace par une vraie entree lue.
5. `/ +` fait un reduce avec `+` pour sommer toute la liste.
6. `!` affiche.

## Task 3 - Somme de reels (ici convertis)

Objectif: similaire a Task 2, mais les tests incluent des valeurs negatives/"reelles".

Payload:

```txt
! / + @ ° @ $ | $ 0
```

Idee:

- Meme strategie que Task 2.
- `@ °` applique une conversion vers int apres lecture des inputs, ce qui stabilise le type pour l'addition.

## Task 4 - Palindrome

Objectif: retourner `True` si la chaine est un palindrome, sinon `False`.

Payload:

```txt
& (.)(?:(.)(?:(.)(?:(.)(?:(.)(?:(.)\5|\5?)\4|\4?)\3|\3?)\2|\2?))?\1 ~ 1 $ .1.
```

Source d'inspiration: https://medium.com/analytics-vidhya/coding-the-impossible-palindrome-detector-with-a-regular-expressions-cd76bc23b89b

Idee:

1. On lit la chaine avec `$`.
2. `~` fait un `re.sub(pattern, replacement, string)`.
3. Le pattern detecte la structure palindrome (avec groupes de capture et symetrie).
4. Si c'est un palindrome, la chaine est remplacee par `1`.
5. `& ... .1.` verifie ensuite si le resultat matche `1`.

Ce payload evite de manipuler explicitement les indexes: tout est delegue a la regex.

## Task 5 - Pyramide de chiffres

Objectif: pour `X`, construire la pyramide `0`, `01`, `012`, ... jusqu'a `X`.

Payload:

```txt
@ / + @ § § ~ o $ \[0-[0-o]\]
```

Intuition:

1. `$` lit `X`.
2. `~` injecte `X` dans une regex de type intervalle.
3. `§` deploie la regex en valeurs concretes.
4. Un second `§` puis combinaison `@`/`/ +` servent a accumuler les prefixes successifs pour former la pyramide.

Le coeur de l'astuce est d'utiliser le moteur regex+deploy comme generateur de sequences, puis de reduire/mapper pour obtenir le format final.

## Task 6 - Pyramide d'etoiles

Objectif: afficher:

- `*`
- `**`
- `***`
- ...

jusqu'a la hauteur demandee.

Payload:

```txt
! + ¤ 0 *b ¤ ° -1 @ ! @ ~ . ¤ 0 *b @ / + @ § § ~ o - $ 1 \[1-[1-o]\]
```

Idee generale:

1. Construire une suite de longueurs `1..X` (variante proche de Task 5).
2. Transformer chaque longueur en repetition de `*` (via substitutions/duplications).
3. Imprimer le rendu ligne par ligne avec `!`.

Ce payload est dense, mais c'est essentiellement: generer des longueurs, transformer en chaines, afficher.

## Task 7 - Echec au roi (regex only)

Objectif: on recoit 8 lignes (echiquier), il faut dire si `♔` est en echec par `♛`, `♜`, ou `♝`.

Payload:

```txt
_ ((([♛♜](.{9}\ )*.{9})♔)|((♔(.{9}\ )*.{9})[♛♜])|(([♛♜](\ {0,6}))♔)|((♔(\ {0,6}))[♛♜]))|((([♛♝].{10}(\ .{10})*)♔)|((♔.{10}(\ .{10})*)[♛♝])|(([♛♝].{8}(\ .{8})*)♔)|((♔.{8}(\ .{8})*)[♛♝])) / + @ : @ + aa @ : @ $ | 8 0
```

Inspiration: https://youtu.be/bqRHH74i1Ws

Idee:

1. Lire les 8 lignes avec `$` et `| 8 0` puis `@ $`.
2. Reorganiser/concatener le plateau avec `@ :`, `+`, `/ +` et le separateur `aa` pour creer une representation lineaire pratique.
3. Appliquer `_` (search regex) avec un gros pattern qui couvre:
   - attaques tour/reine (horizontales/verticales)
   - attaques fou/reine (diagonales)
4. Si une configuration valide est trouvee, le resultat est `True`.

Le regex final est l'union de sous-patterns correspondant a chaque direction d'attaque.

## Notes de verification (Task 7)

Exemples de plateaux de test utilises pendant la construction de la regex:

```txt
  ♝     aa        aa    ♔   aa        aa        aa        aa        aa        aa

        aa        aa    ♝   aa   ♔    aa        aa        aa        aa        aa

  ♔     aa        aa    ♝   aa        aa        aa        aa        aa        aa

        aa        aa    ♔   aa        aa        aa ♝      aa        aa        aa

    ♜   aa        aa    ♔   aa        aa        aa        aa        aa        aa

        aa        aa    ♔   aa        aa    ♜   aa        aa        aa        aa

        aa        aa    ♔ ♜ aa        aa        aa        aa        aa        aa

        aa        aa  ♜   ♔ aa        aa        aa        aa        aa        aa
```

Sous-patterns (conserves pour reference):

```txt
# Bishop / Queen
([♛♝].{10}( .{10})*)♔
(♔.{10}( .{10})*)[♛♝]
([♛♝].{8}( .{8})*)♔
(♔.{8}( .{8})*)[♛♝]
(([♛♝].{10}( .{10})*)♔)|((♔.{10}( .{10})*)[♛♝])|(([♛♝].{8}( .{8})*)♔)|((♔.{8}( .{8})*)[♛♝])

# Rook / Queen
([♛♜](.{9} )*.{9})♔
(♔(.{9} )*.{9})[♛♜]
([♛♜]( {0,6}))♔
(♔( {0,6}))[♛♜]
(([♛♜](.{9} )*.{9})♔)|((♔(.{9} )*.{9})[♛♜])|(([♛♜]( {0,6}))♔)|((♔( {0,6}))[♛♜])

# Final
((([♛♜](.{9} )*.{9})♔)|((♔(.{9} )*.{9})[♛♜])|(([♛♜]( {0,6}))♔)|((♔( {0,6}))[♛♜]))|((([♛♝].{10}( .{10})*)♔)|((♔.{10}( .{10})*)[♛♝])|(([♛♝].{8}( .{8})*)♔)|((♔.{8}( .{8})*)[♛♝]))
```

## Conclusion

Le challenge est surtout un exercice de detournement d'operateurs:

- utiliser `|`, `@`, `/` pour emuler des boucles
- utiliser `~`, `&`, `_`, `§` pour faire le gros du travail via regex
- accepter la logique de pile inversee pour ecrire des payloads compacts

Une fois ce modele compris, les 7 tasks deviennent des variations sur "generer une liste", "la transformer", puis "verifier/imprimer".

Ce qu'il faut retenir en conditions reelles (avec seulement `relang.txt`): avancer par micro-tests en sandbox sur chaque operateur (`$`, `|`, `@`, `/`, `~`, `§`) avant de composer un gros payload.
