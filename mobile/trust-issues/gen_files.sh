#!/usr/bin/env bash

set -xe

cd "$(dirname "$0")"

: "${ANDROID_HOME:?ANDROID_HOME must point to an Android SDK with platform/build-tools for compileSdk 36}"

mkdir -p dist

pushd src/android-trustissue >/dev/null
./gradlew --no-daemon clean assembleDebug
popd >/dev/null

cp src/android-trustissue/app/build/outputs/apk/debug/app-debug.apk dist/trust-issues.apk
