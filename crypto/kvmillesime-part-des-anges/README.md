# KVMillésime - La part des Anges

- *Auteur* : Korabal
- *Catégorie* : Cryptographie
- *Difficulté* : Très difficile


## Description 

De l'ingénierie de la crypto. De la virtualisation. Et un peu de maths :)

Le challenge repose sur une incoherence entre le cycle de vie memoire d'une VM et une implementation RSA-CRT.

## Build et run

Depuis `src/` :

```bash
docker compose build
docker compose up
```

Services exposes :
- backend websocket sur `1337`
- interface web sur `8080`

## Regeneration des fichiers joueurs

Depuis la racine du challenge :

```bash
./gen_files.sh
```

Le script regenere `files/sources.zip` a partir des sources necessaires du challenge.


## Notes 

Attention, le `solve.py` ne marche pas à tous les coups. Il faut souvent quelques exécutions.

