# Emulated Trust

## Informations

| Champ | Valeur |
|-------|--------|
| **Auteur** | AntwortEinesLebens |
| **Catégorie** | Reverse |
| **Difficulté** | Moyen |

## Description

Breizh Systems a développé un prototype intégrant plusieurs mécanismes destinés à protéger l'exécution de ses binaires critiques.

Ce programme applique différentes politiques internes visant à détecter toute tentative d'analyse ou de modification.

Comprendre comment contourner ces protections pourrait être déterminant.

## Thèmes abordés

- Emulation
- Qiling
- Anti-tamper
- Anti-debug

## Fichiers fournis

- `files/bs_emulated_trust` - Binaire ELF

## Compilation

```bash
./gen_files.sh
```

Le binaire sera généré dans `build/bs_emulated_trust`.
