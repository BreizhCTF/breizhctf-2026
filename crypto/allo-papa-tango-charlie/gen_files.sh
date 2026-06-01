#!/bin/bash

# Définition des chemins
SOURCE_FILE="src/server.py"
DEST_DIR="files"
DEST_FILE="$DEST_DIR/allo_papa_tango_charlie.py"

if [ ! -d "$DEST_DIR" ]; then
    mkdir -p "$DEST_DIR"
fi

if [ ! -f "$SOURCE_FILE" ]; then
    echo "Erreur : Le fichier source '$SOURCE_FILE' est introuvable."
    exit 1
fi

cat "$SOURCE_FILE" > "$DEST_FILE"
echo "Fichier utilisateur généré. Vérifiez que le flag n'est plus présent."
