# Lost in a Maze

## Informations

| Champ          | Valeur             |
| -------------- | ------------------ |
| **Auteur**     | AntwortEinesLebens |
| **Catégorie**  | Reverse            |
| **Difficulté** | Difficile          |

## Description

Un dev nommé Mousshack aime développer des jeux vidéo et, avec l'essor de l'IA, il a décidé de coder un jeu dans le terminal.

Pour la connexion avec le serveur, il a rejeté TLS et inventé un algorithme de chiffrement sans échange de clé.

Convaincu que sa solution révolutionne les échanges mondiaux, il vous envoie son jeu et une capture réseau d'une partie avec un secret caché.
Montrez-lui qu'il se trompe.

## Thèmes abordés

- `Rust`
- `AES-GCM`
- `SHA256`

## Fichiers fournis

- `files/lost_in_a_maze` - Binaire ELF du client
- `files/template.py` - Squelette de script pour analyser la capture
- `files/game.pcap` - Capture réseau d'une partie

## Compilation

```bash
./gen_files.sh
```

Le binaire sera généré dans `files/lost_in_a_maze`.

## Génération de la capture

Lancez le serveur local :

```bash
./start_server.sh
```

Dans un second terminal, lancez l'enregistrement réseau :

```bash
sudo tcpdump -i lo -Z root udp port 4000 -w files/game.pcap
```

Dans un troisième terminal, lancez le client :

```bash
cd src
cargo run --bin client
```

Choisissez ensuite le mode `Online`, sélectionnez la plus grande map, puis déplacez-vous avec les flèches directionnelles jusqu'à trouver la sortie.

Dès que le message de victoire s'affiche, stoppez l'enregistrement avec `Ctrl+C`.
