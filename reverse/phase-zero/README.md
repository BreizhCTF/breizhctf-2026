# Phase Zero

## Informations

| Champ          | Valeur             |
| -------------- | ------------------ |
| **Auteur**     | AntwortEinesLebens |
| **Catégorie**  | Reverse            |
| **Difficulté** | Facile             |

## Description

Après la montée des tensions mondiales, de nombreux pays ont renforcé leurs investissements en cybersécurité.

Une entreprise émergente, Breizh Systems, s’est imposée dans la protection des binaires critiques. Malgré la réputation de ses outils, certains de ses premiers prototypes ont récemment fuité.

Parmi ces archives figure un programme expérimental, issu d’un projet visant à déplacer des décisions critiques en dehors des chemins d’exécution classiques.

À première vue, tout semble normal.

## Thèmes abordés

- `init_array`
- `memfrob` (XOR 0x2A)
- Fake entry point

## Fichiers fournis

- `files/bs_phase_zero` - Binaire ELF strippé

## Compilation

```bash
./gen_files.sh
```

Le binaire strippé sera généré dans `build/bs_phase_zero`.
