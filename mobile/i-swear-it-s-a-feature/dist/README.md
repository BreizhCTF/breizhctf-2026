# dist/

Les APK seront ajoutees ici via LFS une fois finalisees :
- `bzhmessenger.apk`
- `vaultpass.apk`

Les projets Android complets sont dans `src/` et peuvent etre build avec :

```bash
# BzhMessenger
cd src/android-messenger/
ANDROID_HOME=/path/to/Android/Sdk ./gradlew assembleDebug
# APK generee dans app/build/outputs/apk/debug/app-debug.apk

# VaultPass
cd src/android-vaultpass/
ANDROID_HOME=/path/to/Android/Sdk ./gradlew assembleDebug
# APK generee dans app/build/outputs/apk/debug/app-debug.apk
```
