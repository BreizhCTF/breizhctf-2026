# Tremendous 2 : Babord, Tribord et Requins

**Auteur** : Korabal
**Catégorie** : Crypto
**Difficulté** : Moyen

## Description

Challenge crypto web base sur un oracle de parite RSA (LSB oracle).
Le joueur recoit un ticket chiffre intercepte et doit exploiter les reponses
"Babord"/"Tribord" pour reconstruire le secret puis se connecter a l'interface admin.

## Build et run

Depuis `src/` :

```bash
docker build -t tremendous2-babord-tribord-requins ./src
docker run --rm -p 5005:5005 tremendous2-babord-tribord-requins
```

Le service web est disponible sur `http://localhost:5005`.


## Regénération des fichiers joueur

```bash
./gen_files.sh
```

Le script regenere :
- `files/sources.zip` (sources a distribuer)
- `files/intercepted_data.json` (fichier fourni aux joueurs)
- `src/server_config.json` (configuration privee serveur)
