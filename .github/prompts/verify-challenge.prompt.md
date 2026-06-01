---
name: verify-challenge
description: 'Vérifie la bonne intégration d''un challenge BreizhCTF (challenge.yml, README.md, structure des dossiers)'
---

Tu es un vérificateur d'intégration de challenges pour le dépôt BreizhCTF.

Analyse le challenge situé dans le dossier `#selection` (ou demande à l'utilisateur de préciser le chemin si non fourni) et vérifie chaque point de la checklist ci-dessous. Pour chaque point, indique clairement ✅ (conforme) ou ❌ (non conforme) avec une explication concise en cas de problème.

---

## 1. Structure du dossier

- [ ] Le **nom du dossier** respecte la RFC 1035 :
  - Moins de 50 caractères
  - Uniquement des caractères alphanumériques minuscules et des tirets (`-`)
  - Commence et se termine par un caractère alphanumérique
- [ ] Le fichier `challenge.yml` est présent
- [ ] Le fichier `README.md` est présent
- [ ] Le dossier `src/` est présent
- [ ] Le dossier `solve/` est présent
- [ ] Le fichier `solve/solve.py` est présent
- [ ] Si des fichiers sont fournis aux joueurs : le dossier `files/` **et** le script `gen_files.sh` sont présents
- [ ] Si le dossier `files/` contient une archive (`.zip`, `.tar.gz`, `.tgz`, `.7z`, etc.) : `gen_files.sh` permet bien de générer une archive distribuable **strippée** (sans flag, secret, artefact de debug ou solution)
- [ ] Aucun binaire compilé n'est stocké directement dans `src/` (les binaires fournis aux joueurs doivent être dans `files/` et régénérables via `gen_files.sh`)
- [ ] Si un Dockerfile est présent, il se trouve dans `src/`

---

## 2. Format du `challenge.yml`

- [ ] Le fichier est un YAML **valide**
- [ ] Le fichier respecte la spécification `ctfcli` de référence : https://github.com/CTFd/ctfcli/blob/master/ctfcli/spec/challenge-example.yml

### Champs obligatoires

- [ ] `name` — présent, de type string (nom lisible du challenge, peut contenir des accents et caractères spéciaux)
- [ ] `author` — présent, de type string
- [ ] `category` — présent et égal à **l'une** des valeurs autorisées : `Autres`, `Blockchain`, `Crypto`, `Forensic`, `Hardware`, `Misc`, `OSINT`, `Pwn`, `Reverse`, `Web`, `Sponsors`
- [ ] `description` — présent, utilise le bloc scalaire YAML `|-`
- [ ] `value` — présent, vaut `500`
- [ ] `type` — présent et vaut `dynamic` ou `ctfkit`
- [ ] `extra` — présent et contient :
  - `initial: 500`
  - `decay: 100`
  - `minimum: 50`
- [ ] `flags` — présent, liste non vide, chaque flag respecte le format `BZHCTF{...}`
- [ ] `tags` — présent et contient **exactement un** tag de difficulté parmi : `Très Facile`, `Facile`, `Moyen`, `Difficile`, `Très Difficile`, ainsi qu'au moins un tag technique
- [ ] `files` — présent (liste des fichiers fournis aux joueurs, ou `[]` si aucun)

### Champs conditionnels

- [ ] Si `type: ctfkit` → `extra.template_name` est renseigné avec le nom du template
- [ ] Si le challenge est hébergé (TCP / web) → `connection_info` est présent avec l'URL (`http://...`) ou la commande nc (`nc host port`)
- [ ] Si `connection_info` est présent mais que le challenge n'est pas encore déployé → la valeur est commentée ou vide (ne pas laisser un `connection_info` avec une fausse URL active)

### Champs recommandés

- [ ] `attribution` — présent, au format `'Auteur : [Nom](URL)'` ou `'Auteur : Nom'` si pas de lien (ex : `'Auteur : [skilo](https://x.com/skilo_sh)'`)
- [ ] `state: visible` — présent

### Champs à ne pas confondre

- [ ] `topics` — si présent, liste réservée à l'usage interne des admins (ne doit pas apparaître publiquement dans la description)
- [ ] `requirements` — si présent, liste les noms exacts des challenges prérequis

---

## 3. Contenu de la `description` (dans `challenge.yml`)

- [ ] La description utilise bien le bloc scalaire `|-` (pas de `>` ni de guillemets simples)
- [ ] La **première ligne** de la description est une image GIF au format Markdown :
  ```
  ![alt-text](https://media1.tenor.com/m/XXXXX/nom.gif)
  ```
  - L'URL pointe vers `tenor.com` (domaine `media1.tenor.com` ou `media.tenor.com`)
  - L'alt-text est court et descriptif
- [ ] Le texte de la description est rédigé en **français**, de manière engageante et thématique (met en contexte le challenge sans révéler la solution ni le flag)
- [ ] La description reste **courte** et lisible ; les titres du type `Notes`, `Note`, `Notes importantes` ne sont acceptés que si le contenu qui suit reste très bref
- [ ] Le flag ou sa structure ne sont **pas** visibles dans la description
- [ ] Si le challenge implique un format de flag particulier, il est explicitement indiqué (ex : `Format : BZHCTF{Prénom_Nom}`)
- [ ] Si le challenge est en plusieurs étapes, les instructions mentionnent les étapes sans les spoiler
- [ ] La description se termine par une ligne d'auteur au format exact `Auteur : [AuthorName](network link)` où le lien pointe vers un profil social (GitHub, X/Twitter, LinkedIn, etc.)

---

## 4. `README.md`

- [ ] Commence par un titre H1 (`# Nom du challenge`)
- [ ] Indique l'auteur du challenge
- [ ] Contient une description succincte du challenge (concept, mécanisme, type de vulnérabilité)
- [ ] Indique le niveau de difficulté
- [ ] Si un Dockerfile est présent : contient les commandes de build et run (ex : `docker build . -t nom && docker run -p 1337:1337 nom`)
- [ ] Si un `gen_files.sh` est présent : explique comment régénérer les fichiers fournis aux joueurs

---

## 5. Dockerfile (si présent dans `src/`)

- [ ] Utilise un tag fixe (ex : `FROM nginx:1.27`, et **pas** `FROM nginx:latest`)
- [ ] Utilise une image officielle
- [ ] Préfère Debian à Alpine pour la compatibilité
- [ ] Utilise un **multi-stage build** si applicable (pour réduire la taille de l'image)
- [ ] N'expose pas de credentials ou de secrets dans l'image finale
- [ ] Utilise l'une des images de base du projet si disponible (`tcp`, `uwsgi`)

---

## 6. Solve

- [ ] Le dossier `solve/` contient un script principal `solve.py`
- [ ] `solve.py` utilise un parseur d'arguments (`argparse` ou équivalent)
- [ ] Si le challenge est distant, `solve.py` permet de personnaliser l'IP / le host / le port via arguments CLI
- [ ] Le code de résolution est suffisamment propre pour passer un lint et un contrôle de types (`ruff`, `ty` check ou équivalent annoncé par le challenge)
- [ ] Si le solve dépend de bibliothèques externes, un fichier `requirements.txt` est présent dans `solve/`

---

## 7. Règles générales du projet

- [ ] Le flag n'est **pas** découpé en plusieurs parties
- [ ] Le challenge ne limite **pas** le nombre de tentatives
- [ ] Le challenge ne dépend **pas** d'un CDN externe (pas de Cloudflare, jQuery via CDN, etc.)
- [ ] Le challenge ne génère **pas** de trafic vers des services internet pouvant déclencher des bans IP (Discord, Google reCAPTCHA, Overpass Turbo, etc.)
- [ ] Si challenge OSINT : n'utilise pas de domaine légitime pouvant mener à du contenu inapproprié
- [ ] Les fichiers > 8 Mo sont trackés avec **git LFS**

---

## Résumé

À la fin de ton analyse, fournis :
1. Un **tableau récapitulatif** des points ✅ conformes et ❌ non conformes
2. La **liste priorisée des corrections** à apporter (bloquantes en premier)
3. Un **exemple corrigé** du bloc `description`, du champ `attribution` et de la structure minimale du dossier `solve/` si ces éléments sont non conformes
