---
marp: true
title: "BreizhCTF — Chall-maker : guide & RETEX"
description: "Guide du chall-maker : bonnes pratiques et frictions récurrentes (Discord, relectures Zeecka & Maëlle)"
author: "Orga BreizhCTF"
paginate: true
theme: default
class: lead
backgroundColor: #fdfdff
---

<!--
Deck Marp : guide & RETEX pour les chall-makers du BreizhCTF.
Synthèse des bonnes pratiques et frictions récurrentes repérées en croisant
l'historique Discord et les relectures de Zeecka (Alex GARRIDO) et Maëlle (Maëlle LE BON).
Citations Discord : [Discord AAAA-MM-JJ].
Rendu : `marp CONTRIBUTING_SLIDES.md --pdf` (ou extension Marp pour VS Code).
-->

# 🚩 BreizhCTF — Guide du Chall-maker
## Bonnes pratiques & RETEX

Le guide du chall-maker, en slides : **règles**, **frictions récurrentes**
et **solutions** issues des relectures de **Zeecka** & **Maëlle** et de l'historique Discord.

> En cas de doute : **on en parle avec Kaluche**.

---

## 🗺️ Les frictions qui reviennent chaque édition

Les mêmes remarques reviennent **en relecture**. Top frictions :

1. **Description trop longue** dans `challenge.yml` → moche sur CTFd
2. **Nommage incohérent** (branche ≠ dossier ≠ nom du chall ≠ catégorie)
3. **`docker-compose` / volumes** dans des challs censés tourner en prod
4. **Flag placeholder oublié** / `flag.txt` absent du build
5. **Writeup manquant** ou trop léger / non testé par un tiers
6. **Dépendances Internet** (ban IP sur IP publique partagée)

👉 Objectif de ce deck : **les éliminer en amont**, pas en relecture.

---
<!-- _class: lead -->

# 1. Consignes générales de jeu

---

## 🎮 Les règles de base (non négociables)

- **Pas** de challenge à **nombre de tentatives limité** (aucun blocage toléré).
- **Pas** de flag **multi-parties** `BZHCTF{p1:p2:p3}` (sauf exception validée).
- Challenges **multi-étapes** : **toutes les étapes ouvrent** en même temps,
  pour éviter qu'un joueur reste bloqué (tant pis si l'étape 3 spoile l'étape 1).
- Le scoring est **dégressif** (`500 → 100`, min 50) selon le nombre de solves.

> La difficulté annoncée est **indicative uniquement** : ne vous battez pas dessus.

---

## 📉 Conséquence du scoring dégressif

Un challenge **peu solvé** rapporte **beaucoup** à ceux qui le réussissent.

> *« Les gens peuvent passer la nuit pour l'exclusivité des points »* sur un chall peu solvé.

**À garder en tête en concevant**
- Un chall « très dur » peut finir avec **0 ou 1 solve** → c'est OK, c'est prévu.
- Calibrez le niveau pour que la **majorité** des joueurs trouve les faciles,
  et que les difficiles **récompensent** sans frustrer.

---
<!-- _class: lead -->

# 2. `challenge.yml` : l'hygiène qui fait gagner du temps

---

## 📝 Description : courte, sinon en pièce jointe

**Friction récurrente**
> *« La description est trop longue, réduis-la et on pourra merge. »*

**Règle**
- La `description` est **ce qui s'affiche sur le CTFd**. Trop longue = scroll / rendu cassé.
- Besoin de plus d'instructions ? → **`README` fichier joint en ressource**.

```yaml
description: |-
    ![meme](https://media.tenor.com/randomvalue/)

    Énoncé court et percutant. Détails longs → fichier joint.
```

---

## 🖼️ GIF / image : obligatoire & léger

La description **doit contenir au moins une image**, et son **URL doit répondre**.

**Règles**
- Garder le préfixe **`https://media.tenor.com/`** et **un seul suffixe**.

**Exemple**

```yaml
![maze](https://media.tenor.com/SAviEA7OrT8AAAAd/)
```

> 💡 Pas de GIF ? L'orga en mettra un par défaut ; vous le changerez ensuite (mais pas le jour J !).

---

## 🚩 Flag : format & placeholders

Chaque flag doit matcher **`BZHCTF{.+}`** (bloquant à l'intégration).

**Pièges vus en relecture**
- Flag resté en **placeholder** dans `files/`
- **`flag.txt` manquant** dans le build Docker

**Règles**
- OSINT : flags **case-insensitive / regex** dans `challenge.yml`.
- **Pas** de *« Syntaxe de flag attendue : BZHCTF{...} »* dans la description, si c'est déjà le format normal.

---

## 🚩 Flag : format & placeholders

```yaml
flags:
    # A static case sensitive flag
    - BZHCTF{3xampl3}
    # A static case insensitive flag
    - {
        type: "static",
        content: "BZHCTF{3xampl3}",
        data: "case_insensitive",
    }
    # A regex case insensitive flag
    - {
        type: "regex",
        content: "BZHCTF{(.*)STUFF(.*)}",
        data: "case_insensitive",
    }
```

---

## 🧹 `challenge.yml` : nettoyage & champs

- **Supprimer les clés YAML vides** (`hint`, `requirements`, …) plutôt que les laisser nulles.
- `tags:` **doit** contenir une difficulté : `Très Facile` / `Facile` / `Moyen` / `Difficile` / `Très Difficile`.
  - Respected la case `Camel Case`
- Tout fichier listé dans `files:` **doit exister**, et tout fichiers dans `files/` doit être listé.
- **Ne touchez pas aux valeurs de points** : gardez `value: 500` et les paramètres dans `extra` **tels quels** (le scoring dégressif est géré par la plateforme).

---

## 🧹 `challenge.yml` : nettoyage & champs

- Utiliser une `description` qui fini par
    - `Auteur : [Pseudo](https://discord.com/users/xxx)`
- Utiliser une `attribution` qui vaut
    - `Auteur : [Pseudo](https://discord.com/users/xxx)`

> 📑 `challenge.yml` suit la **spec ctfcli** : voir le fichier de référence
> [`challenge-example.yml`](https://github.com/CTFd/ctfcli/blob/master/ctfcli/spec/challenge-example.yml) ainsi que celui fournis par les exemples de l'infra.

---

## 🧹 `challenge.yml` : nettoyage & champs

```yaml
description: |-
    ![my_gif](https://media.tenor.com/NarRX0m-o1IAAAAi/)

    Contenu de ma description

     Auteur : [Lamarr](https://discord.com/users/361136527709044737)
attribution: 'Auteur : [Lamarr](https://discord.com/users/361136527709044737)'
tags:
    - Moyen
    - Flask
value: 500
state: visible
extra:
    initial: 500
    decay: 100
    minimum: 50
```

---

## 🔌 `connection_info` vs `template_name`

On distingue 3 types de challenge: les challenges sans services, les instances individuelles à démarrer (`dedicated`), et les challenges partagés (`shared`).

Selon le `type` du challenge :

- `type: dynamic` (sans instance), pas de `connection_info` ni `extra.template_name`
- `type: dynamic` (`dedicated`) + Dockerfile → `connection_info` **renseigné** (en cas de service), **pas** de `extra.template_name`
- `type: ctfkit` (`shared`) → `extra.template_name` renseigné, **pas** de `connection_info`

---

## 🔌 `connection_info` vs `template_name`

**Merci de nous contacter pour chaque challenge avec service**

> 🔧 `connection_info` / `template_name` / sous-domaine :
- Vous pouvez utiliser le nom du dossier comme `template_name`
- Vous pouvez utiliser `https://challenge-name.chall.ctf.bzh` ou `nc challenge-name.chall.ctf.bzh 1337`

---

## ⚙️ À la demande (`dedicated`) vs partagé (`shared`)

**Comment choisir** :
- **À la demande** si : RCE possible, le joueur peut **altérer le flag/binaire**, ou l'état mémoire compte.
- **Partagé** si : un reboot **ne change pas** la faisabilité, pas de RCE/altération.

> ℹ️ Service partagé avec bot (Puppeteer…) → attention aux **files d'attente**, priviligier `shared`.

---
<!-- _class: lead -->

# 3. Nommage & arborescence

---

## 🌳 Structure d'un challenge

Un **sous-dossier par catégorie**, puis un **sous-dossier par challenge** :

```text
nom-categorie/
└── nom-challenge/
    ├── README.md        # décrit le chall : auteur, description, difficulté…
    ├── challenge.yml    # mêmes infos, format machine (ctfcli)
    ├── src/             # toutes les sources du chall (libre mais clean)
    │   └── Dockerfile   # si le chall est hébergé
    ├── files/           # fichiers FOURNIS aux joueurs
    ├── gen_files.sh     # régénère files/ de façon reproductible
    └── solve/
        ├── solve.py
        └── WRITEUP.md
```

---

## 🧭 Un seul nom partout

**Une des frictions les plus citée par Zeecka :**
> *« Évitez d'attribuer plusieurs noms à vos challs (branche `forensic_difficile`,
> dossier `forensic_3`, nom du chall `What's in my logs`)… on s'y perd pour les reviewers. »*

> *« Un dossier Forensic / FORENSIC / forensic + un `challenge.yml` avec 3 typos de catégorie… c'est long à homogénéiser. Même sur le simple, vérifiez que ça match. »*

**Règle : nom homogène** branche ↔ dossier ↔ `name` ↔ categorie.

---

## 📐 RFC 1035 & fichiers joueurs

**Dossier (RFC 1035)**
- Minuscules, **alphanumériques** ou **tirets** uniquement.
- < 50 caractères, **commence et finit** par un alphanumérique.

**Fichiers fournis aux joueurs**
- **Pas** de `sources.zip` / `fichier.pcap` / `dump.raw` génériques → **nom du chall** pour que les joueurs s'y repèrent.
- **Rien à la racine** du dossier (*« pourquoi ce dossier est à la racine ? »* ×3 sur une seule relecture).

---

## 🏷️ Titre & catégorie : majuscule + cohérence

**Titre**
- **Nom du challenge pas trop long** dans **`challenges.yml`** (affichage CTFd), les emoji autorisés.
- Nom du dossier du challenge doit respecter `[a-z0-9\-]`, par exemple `my-rev-2`
- Pour les séries de challenges, utiliser `nom-chall-1`, `nom-chall-2` pour les dossiers.
- Pour les séries de challenges, utiliser `Nom challenge [1/2]`, `Nom challenge [2/2]` pour **`challenges.yml`**.
- Pas de noms type *« crypto facile 1 »* : un **vrai nom**, homogène sur la suite.

---

## 🏷️ Titre & catégorie : majuscule + cohérence

**Catégorie**
- Nom du dossier de la catégorie déclaré dans le fichier `.categories` (demander à modifier au besoin).
- **Nom de la catégorie** commence par une Majuscule dans **`challenges.yml`**
  - Exemples edge-cases: `OSINT`, `Game Hacking`, sinon: `Reverse`, `Mobile`, ...

---
<!-- _class: lead -->

# 4. Docker & Infra : ça doit tourner en prod

---

## 🐳 Pas de `docker-compose`, volumes, ni alias

**Friction majeure** (Maëlle, plusieurs fois) :
> *« Les Dockerfile doivent se suffire à eux-mêmes (pas de docker-compose en prod).
> Donc les `volumes` c'est pas possible. Les alias dans le compose sont très problématiques. »*

---

## 🐳 Pas de `docker-compose`, volumes, ni alias

**Règles**
- **Un challenge = des Dockerfile autoportants.** Tout intégré dans l'image.
- **Pas de `volumes`**, **pas de `host_aliases`** : pas de hosts statiques pour des challenges à la demande.
- **Plusieurs Dockerfile ?** → les nommer `*.Dockerfile` (`front.Dockerfile`, `back.Dockerfile`).
- **`privileged: true`** : à **éviter**, et **prévenir l'orga** si indispensable (souvent inutile).

---

## 🏗️ Hébergement & registry

Si votre chall est hébergé, fournissez un **`Dockerfile`** dans `src/`.
La pipeline le **build automatiquement** et publie l'image.

**Images de base maison à privilégier**
- `tcp` → pwn / tout ce qui communique en TCP.
- `uwsgi` → Flask clef en main.
- `nginx` → Nginx clef en main.

---

## 🧱 Images de base : stables & reproductibles

- **Tags fixes** (`FROM nginx:1.27`, pas `:latest`).
- **Images officielles** (pas l'image à 10 stars pas maintenue).
- **Debian > Alpine** : éviter les emmerdes de **musl-libc**.
- **Multi-stage** pour réduire la taille (et avoir un builder reproductible).

> ❌ Ne **pas** committer `__pycache__` / `node_modules`.

---

## 🔐 Permissions : ne pas tout faire tourner en root

**Vu en relecture (Maëlle)**
> *« Je me suis permise de modifier les permissions : tout tournait en root, donc le `/getflag` ne servait à rien. »*

- Privilégier l'user `challenge:challenge`
- Principe du moindre privilège
- Prévenir l'infra en cas de binaire `suid` du type `./getflag` (la politique de sécu va bloquer sinon)

---

## 🚫 La règle « PAS DE VPS »

> *« Déjà que ce chall nécessite Internet c'est un red flag pour moi. Qu'il faille en plus unVPS sans reverse proxy avec un domaine, c'est n'importe quoi. »* — [Discord 2025, Maëlle]

**Pourquoi**
- Vous ne maîtrisez pas la **dispo** ni la **sécu** d'un VPS perso.
- Un VPS perso ne s'intègre pas à l'isolation / au scaling de l'infra.

👉 **Pas de VPS perso.** Tout passe par l'infra : **Dockerfile → registry → kube**.
👉 **Pas de domaine perso.** Tout passe par l'infra : **\*.chall.ctf.bzh**.

---
<!-- _class: lead -->

# 5. Fichiers fournis : génération reproductible

---

## 🔁 `gen_files.sh` : tout fichier doit se régénérer

**Aucun binaire « sorti de nulle part ».** Les fichiers fournis (binaires, archives…)
doivent être **recompilables par n'importe quel orga** via `gen_files.sh`.

```dockerfile
# src/build.Dockerfile
FROM debian:bookworm
RUN apt-get update && apt-get install -y build-essential
COPY main.c /
RUN gcc -o /challenge /main.c
```

```bash
# gen_files.sh
docker build -t chall -f src/build.Dockerfile src
docker create --name instance chall
docker cp instance:/challenge ./files/challenge
docker rm instance && docker rmi chall
```

---

## 🎞️ Fichiers non automatisables (PCAP, OVA…)

Certains fichiers ne peuvent **pas** être générés par script (PCAP capturés, OVA, vidéos…).

**Règle**
- Le `README.md` doit **décrire ce qui a été fait** pour générer le fichier
  (étapes, outils, environnement) — pour qu'on puisse le **reproduire** au besoin.

> Et pensez **Git LFS** pour ces fichiers volumineux (voir section Git).

---
<!-- _class: lead -->

# 6. Solve & Writeup : reproductible & testé par un autre

---

## ✅ La règle d'or : WU obligatoire + test par un tiers

> *« Pas de write-up = on ne merge pas le chall [...]. Et ce solve doit être validé par un autre membre. »* — [Kaluche, Discord 2024]

**À fournir**
- Writeup rédigé en français (**obligatoire**) dans `solve/WRITEUP.md` (ou `.pdf` pour la crypto).
- `solve.py` présent (si applicable) et **fonctionnel**.
- Challenge **testé par quelqu'un d'autre** (**obligatoire**).

**Le WU explique**, il ne se contente pas de donner le code :
> *« Si on donne juste le `.py` et ce `.md` à quelqu'un qui n'a pas réussi, ce sera pas clair. »*

---

## 🐍 Modèle de `solve.py` : argparse + host/port

**Friction** : solves non rejouables (hardcodés, multi-fichiers, dépendances floues).
Zeecka a dû refacto plusieurs solves : *« solve.py avec CLI (argparse) + host/port en arguments + `requirements.txt` ».*

> Fournir `solve/requirements.txt`. Ne **pas** committer les artefacts générés (ex. `.sage.py`).

---

## 🐍 Modèle de `solve.py` : argparse + host/port

```python
#!/usr/bin/env python3
import argparse
from pwn import remote   # ou requests pour le web

def solve(host, port):
    io = remote(host, port)
    # ... exploit ...
    print(io.recvall().decode())

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("host")
    p.add_argument("port", type=int, nargs="?", default=1337)
    a = p.parse_args()
    solve(a.host, a.port)
```

---

## 🕵️ Unintendeds : exemples concrets

Le test croisé a **systématiquement** révélé des raccourcis :

- **`2026 · pwn · fsp`** — path traversal (`os.path.join` non normalisé, `startswith` trop faible).
- **`2026 · pwn · good_soldier` / `speeeed`** — phase de leak inutile en noPIE.
- **`2026 · web · Escape from "Prison de la santé"`** — bypass du DNS rebinding.
- **`2026 · web · Miamflix`** — `X-Forwarded-For` → bypass OTP, CSRF GraphQL.
- **`2026 · web · Doctosifimal`** — contournement de la login CSRF via le compte du bot.

> *« Whoopsie, je me fais avoir par ma propre vuln. »* — un chall-maker, en relecture 😄 [`2026 · pwn · fsp`]

---

## 🕵️ Unintendeds : la bonne pratique

- Faire **relire/tester par un autre profil** de la catégorie.
- **Documenter** les unintendeds connus dans le WU.
- Parfois on les **garde** s'ils n'enjambent pas d'étape (ça enrichit le chall).

> L'IA aide aussi à les débusquer : tentez de solve **« à la LLM »** (voir section dédiée).

---
<!-- _class: lead -->

# 7. Internet, ratelimits & OSINT

---

## 🌐 600 joueurs, 1 seule IP publique → bans en série

**Incidents réels**
- **Overpass Turbo**, **Pastebin**: ban IP constaté → lister un **max de miroirs** + envisager une **instance auto-hébergée**.
- **Shares**, **Drive**, **Discord** : risque de **BanIP** et **ratelimit** → prévoir des **backups**
- Risque aussi sur les **captcha Google**

**Règles**
- **Limiter au maximum** les interactions avec des services Internet.
- **Pas de CDN** pour le web (ne pas charger jQuery via le CDN Cloudflare, etc.).

---

## 📡 Coupure Internet du lieu & accès réseau

**Risque réel du BreizhCTF** : une **coupure Internet du lieu** peut rendre un
challenge **indisponible** → **frustration** des joueurs et **déséquilibre** entre les teams (certaines ont solve avant la coupure, d'autres restent bloquées).

**Conséquence sur l'infra**
- Par **défaut**, les services **n'ont AUCUN accès à Internet**.
- Si un challenge a **VRAIMENT** besoin d'Internet → **prévenez l'infra** explicitement (et attendez-vous à devoir le justifier).

👉 Concevez **autonome** : tout ce dont le chall a besoin doit être **dans l'image**.

---

## 🔎 OSINT : domaines & contenu

- **Pas de domaine légitime** (dans la mesure du possible) pour éviter les débordements.
- Éviter les recherches pouvant **mener à du p0rn**.
- Ne **pas spoiler** une étape dans la description / le profil d'une autre étape.
- Flags **case-insensitive / regex** (les joueurs ne tapent pas la casse exacte).

> Rappel : pour un chall « bloquant » (OSINT/Forensic), **toutes les étapes s'ouvrent** passé une heure donnée.

---
<!-- _class: lead -->

# 8. Git : branches, gros fichiers, racine propre

---

## 🌿 Workflow Git


- Ne pas hésiter à **Demander de l'aide à l'infra** !
- Une **branche par chall** : `category/nom_du_challenge`.
- Ouvrir une **merge request** (en `Draft`) pour chaque branche poussée
    - Avec le template `Nouveau challenge`.
- Consulter régulièrement vos merge request sur gitlab pour le suivi des retours infra / bots
- Ne **pas toucher** aux fichiers des autres sur votre branche.
- **Garder la racine propre** (cf. *« pourquoi ce dossier est à la racine ? »* ×3).
- **Jamais** de commit sur `main` (GitLab bloque).

---

## 📦 Git LFS pour les gros fichiers (> 8 Mo) et fichiers non structurés

Git n'aime pas les gros fichiers (chaque clone traîne tout l'historique). Pour PCAP, OVA, PDF, vidéos, gros binaires :

```bash
sudo apt install git-lfs        # une fois
git lfs install                 # dans le dépôt
cd categorie/mon-challenge
git lfs track files/gros-fichier.ova
git add . && git commit -m "Ajout de l'OVA" && git push
```

Oubli fréquent en relecture : *« Il aurait fallu le push avec Git LFS. »*

---
<!-- _class: lead -->

# 9. Travailler ensemble : IA, infra & questions

---

## 🤖 L'IA est autorisée (chall-makers **et** infra)

**Oui, vous pouvez utiliser l'IA.** L'orga s'en sert pour estimer la difficulté :
> *« Testé, flag avec Claude Sonnet 4.5. »* — Zeecka, en relecture
> *« Il se fait en 5 minutes (avec un LLM), la difficulté Facile me semble donc OK. »* — un reviewer

**Côté infra aussi** : scripts, refacto de Dockerfile, debug… l'IA est un outil de travail comme un autre.

**⚠️ Concevez en conséquence**
- Un chall peut se faire **bypass par un LLM** → ajoutez de la logique créative si besoin (OCR, contexte visuel, ...).
- L'IA aide aussi à **trouver des unintendeds** : testez votre chall « à la LLM ».

---

## 🤝 L'infra peut compléter votre travail (soyez cool)

Il y a **énormément** à relire et intégrer. Pour avancer, l'orga/infra **complète parfois**
votre merge request et **modifie le solve** quand il manque des morceaux :
> *« J'ai fix le solve.py qui ne marchait pas chez moi, j'ai aussi fix un peu le challenge.yml. »* — Zeecka
> *« J'ai fix le gen_files et MAJ `files/` car le flag était encore un placeholder. »*

**État d'esprit**
- **Ne leur en voulez pas** : c'est pour que **votre** chall passe en prod à temps.
- Pas d'accord avec une modif ? **Demandez gentiment** et on en discute.
- En retour : poussez **propre** pour leur faire gagner du temps.

---

## 💬 Posez des questions — c'est attendu !

**Le plus gros gain de temps : demander tôt.** L'orga insiste, édition après édition :
> *« Vous pushez sur GitLab même si c'est pas fini, sans faute. **Demandez si besoin d'aide**, bien entendu. »* — Kaluche

**Comment**
- **Réunions chall-makers** régulières + **calls / 1-on-1** au besoin.
- Salons **vocaux** dédiés, chans **par catégorie** pour les questions techniques.
- Un blocage infra (à la demande, sous-domaine, LFS, image Sage…) ? → **ping Discord**, ne restez pas seul·e.

> Mieux vaut une question « bête » maintenant qu'un chall cassé le jour J.

---
<!-- _class: lead -->

# 10. Process & deadlines

---

## ⏱️ Pousser tôt, même incomplet

> *« Tu push juste le `challenge.yml` avec la description, ça sera déjà très bien. »* — Zeecka

**Pourquoi la deadline existe** (côté intégration, par chall) :
- Relire l'**orthographe** des `README` / `WRITEUP`.
- Vérifier la cohérence avec les autres challenges.
- Identifier les points de blocage au plus tôt.
- Vérifier qu'il ne reste **pas** de placeholder, de mauvais `connection_info`, ...
- Vérifier que les services HTTP sont bien en **HTTPS**...

---

## 🇫🇷 Langue

- **Côté joueurs** (description, README, WRITEUP) : **français**
  — ne pas ajouter la barrière de la langue aux débutants.
- **Côté code / commentaires** : anglais OK, mais **homogène** dans un même chall.
- ⚠️ L'infra est **open-sourcée** après le CTF → soignez READMEs & WU.

---

## 🔁 Le process de validation (merge request)

Avant même que le challenge soit prêt :

1. Ouvrez une **merge request** avec le template `Nouveau challenge`, cochez la checklist, **prévenez sur Discord**.
2. Un **bot de CI (DangerJS)** vérifie automatiquement votre challenge et **bloque le merge** tant que ce n'est pas vert.
3. Un **humain teste** votre chall (obligatoire) — puis on merge.

> 🟢 Anticipez les vérifs automatiques **avant** de pousser : moins d'allers-retours, intégration plus rapide.

---

## 🤖 Ce que le bot vérifie automatiquement

Tant que ce n'est pas vert, **le merge est bloqué** :

- Titre & catégorie **commençant par une majuscule**.
- Flag au format **`BZHCTF{...}`** et au moins **un tag de difficulté**.
- Une **image valide** (URL qui répond) dans la description.
- Présence de `README.md`, `solve/WRITEUP.md` (ou `.pdf`), `src/`.
- Absence de `__pycache__` / `node_modules`.
- Cohérence `connection_info` / `template_name`.

---

## 🧾 Checklist express (1/2)

**`challenge.yml`**
nom & catégorie en **Majuscule** · GIF `media.tenor.com` valide · description **courte** · flag `BZHCTF{...}` (pas de placeholder) · tag de difficulté · clés vides **supprimées** · `connection_info`/`template_name` selon le `type` · **points non modifiés** (`value: 500` + `extra`) · conforme à la **spec ctfcli**.

**Arbo & Git**
dossier RFC 1035 · branche `category/nom` · noms homogènes · fichiers nommés d'après le chall · racine propre · **LFS** > 8 Mo · pas de `__pycache__`/`node_modules`.

---

## 🧾 Checklist express (2/2)

**Docker**
Dockerfile **autoportant** · pas de compose/volumes/host_aliases · `*.Dockerfile` si plusieurs · pas de `privileged` (sinon prévenir) · `flag.txt` **dans** le build · user non-root.

**Solve / WU**
`WRITEUP.md` présent · `solve.py` (argparse + host/port) + `requirements.txt` ·
**testé par un tiers** · unintendeds documentés · `gen_files.sh` pour les fichiers fournis.

**Internet**
pas de CDN · ratelimits/miroirs/backups anticipés · **pas de VPS perso**.

---
<!-- _class: lead -->

# Merci ! 🦀

**En cas de doute → Zeecka, Maëlle ou Kaluche sur Discord.**
**Et surtout : posez vos questions tôt, pas de demandes bêtes, et on bosse en équipe.**

*Sources : historique Discord & relectures de l'orga (Zeecka — Alex GARRIDO, Maëlle — Maëlle LE BON), réunions chall-makers.*
