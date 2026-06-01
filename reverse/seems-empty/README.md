# Seems Empty

## Informations

| Champ | Valeur |
|-------|--------|
| **Auteur** | AntwortEinesLebens |
| **Catégorie** | Reverse |
| **Difficulté** | Très Facile |

## Description

Lors d'un audit, un fichier Python compilé a été rapidement classé comme sans intérêt.

Son comportement paraissait parfaitement anodin : aucun accès réseau, aucune écriture suspecte, juste un message banal affiché à l'écran.

Relégué parmi les artefacts mineurs, il semble pourtant avoir été altéré pour dissimuler quelque chose dans ce qui ressemble à une simple chaîne de caractères.

Même ce qui semble vide peut cacher un secret.

## Thèmes abordés

- `Python bytecode`
- `Décompilation de .pyc`
- `Caractères invisibles Unicode`
- `StegCloak`

## Fichiers fournis

- `files/seems-empty.pyc` - Bytecode Python compilé

## Compilation

```bash
./gen_files.sh
```

Le fichier compilé sera généré dans `files/seems-empty.pyc`.
