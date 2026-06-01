#!/usr/bin/env bash

CHALLENGE_NAME="online-robbery"

set -e

cd "$(dirname "$0")" || exit 1

zip -rq /tmp/$CHALLENGE_NAME.zip src/ \
	-x "src/.idea/*" "src/.gradle/*" "src/build/*" "src/bin/*" "src/.DS_Store" "src/.git*"

zip -dq /tmp/$CHALLENGE_NAME.zip "src/src/flag.txt" || true
zipnote /tmp/$CHALLENGE_NAME.zip \
	| awk -v challenge_name="$CHALLENGE_NAME" '/^@ src\// { print; print "@=" challenge_name substr($0, 6); next } { print }' \
	| zipnote -w /tmp/$CHALLENGE_NAME.zip

mkdir -p ./files

mv /tmp/$CHALLENGE_NAME.zip ./files/$CHALLENGE_NAME.zip

echo "Generated ./files/$CHALLENGE_NAME.zip"
size_bytes="$(stat -c%s "./files/$CHALLENGE_NAME.zip")"
if command -v numfmt >/dev/null 2>&1; then
    size_human="$(numfmt --to=iec-i --suffix=B "$size_bytes")"
    echo "Size: $size_human ($size_bytes bytes)"
else
    echo "Size: $size_bytes bytes"
fi
echo "SHA256: $(sha256sum ./files/$CHALLENGE_NAME.zip | awk '{print $1}')"
