#!/usr/bin/env bash

CHALLENGE_NAME="no-thanks-i-use-ai"

set -e

cd "$(dirname "$0")" || exit 1

tmp_dir="$(mktemp -d)"
tmp_zip="/tmp/$CHALLENGE_NAME.zip"
trap 'rm -rf "$tmp_dir"' EXIT

cp -a src "$tmp_dir/"
printf 'BZHCTF{placeholder}\n' > "$tmp_dir/src/flag.txt"

(
    cd "$tmp_dir" || exit 1
    zip -rq "$tmp_zip" src/
    zipnote "$tmp_zip" | awk -v name="$CHALLENGE_NAME" '
        /^@ src\// {
            print
            renamed = $0
            sub(/^@ src\//, "@=" name "/", renamed)
            print renamed
            next
        }
        { print }
    ' | zipnote -w "$tmp_zip"
)

mv "$tmp_zip" "./files/$CHALLENGE_NAME.zip"

echo "Generated ./files/$CHALLENGE_NAME.zip"
size_bytes="$(stat -c%s "./files/$CHALLENGE_NAME.zip")"
if command -v numfmt >/dev/null 2>&1; then
    size_human="$(numfmt --to=iec-i --suffix=B "$size_bytes")"
    echo "Size: $size_human ($size_bytes bytes)"
else
    echo "Size: $size_bytes bytes"
fi
echo "SHA256: $(sha256sum ./files/$CHALLENGE_NAME.zip | awk '{print $1}')"
