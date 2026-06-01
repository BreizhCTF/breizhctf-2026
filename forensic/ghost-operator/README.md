# Ghost Operator

**Catégorie** : Forensic / Drone
**Difficulté** : Moyen
**Auteur** : Lamarr

---

## Contexte

**Breizh Aero Survey** opère une flotte de 5 drones de cartographie
(ALPHA, BRAVO, CHARLIE, DELTA, ECHO) le long de la côte bretonne.
Les appareils communiquent avec la station sol via un protocole
standard de télémétrie aéronautique.

Ce matin, pendant un vol de routine, un des drones a cessé de
répondre aux commandes et a quitté sa trajectoire pour se diriger
vers une zone isolée. L'équipe réseau avait un tcpdump actif sur
le lien drone/sol pendant l'incident.

L'analyse préliminaire révèle un acteur réseau non identifié qui
a échangé des messages avec la flotte. Le SOC suspecte une prise
de contrôle suivie d'une exfiltration de données.

Retrouvez ce que l'attaquant a extrait.

## Fichiers

- `ghost_operator.pcap` Capture réseau pendant l'incident

## Flag

Le flag se trouve dans les données exfiltrées par l'attaquant.

**Format** : `BZHCTF{...}`

