# Tremendous 1 - Accès VIP : Sans limites

Auteur : Korabal

## Description
Ce challenge illustre une mauvaise implementation d'un partage de secret de type Shamir.
En supprimant le modulo, le probleme devient bien plus simple et le secret peut etre recupere a partir d'une seule fuite.

## Difficulté
Facile

## Génération des fichiers joueurs
Les fichiers distribues aux joueurs sont dans `files/`.
Pour les regenerer:

```sh
./gen_files.sh
```

Le script regenera `leak.txt` puis mettra a jour `files/leak.txt` et `files/challenge.py`.
