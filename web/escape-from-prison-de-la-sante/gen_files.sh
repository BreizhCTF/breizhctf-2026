#!/bin/bash
set -e

cd "$(dirname "$0")"

FAKE_FLAG="BZHCTF{FakeFlag}"
OUTPUT="files/escape-from-prisondelasanté_players.zip"

rm -f "$OUTPUT"

TMP=$(mktemp -d)
cp -r src/. "$TMP/"

# Le .env de prod n'est jamais expedie. On le remplace par le template joueur.
rm -f "$TMP/.env"
cp src/.env.player "$TMP/.env"
rm -f "$TMP/.env.player"

# Le vrai flag vit dans src/director/flag.txt (committe). On le remplace
# systematiquement par le fake flag dans le zip joueur.
if [ -f "$TMP/director/flag.txt" ]; then
    printf '%s\n' "$FAKE_FLAG" > "$TMP/director/flag.txt"
fi

# Garde-fou : remplace toute occurrence residuelle de flag dans n'importe quel
# autre fichier (Dockerfile, config, seed, etc.).
grep -rl "BZHCTF{" "$TMP" 2>/dev/null \
    | xargs -r sed -i "s|BZHCTF{[^}]*}|${FAKE_FLAG}|g"

mkdir -p files
(cd "$TMP" && zip -r - .) > "$OUTPUT"

rm -rf "$TMP"

echo "Generated $OUTPUT"
