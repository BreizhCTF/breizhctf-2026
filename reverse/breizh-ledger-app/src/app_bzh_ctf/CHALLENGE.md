# Ledger Breizh App

## Environnement

Le joueur va avoir un binaire local avec un fake_flag. Il doit faire la rétro localement et comprendre la logique puis après il pourra demaner une instance qui va lancer speculos avec la vrai application pour récupérer le vrai flag.

- Git : https://github.com/LedgerHQ/speculos
- Doc : https://speculos.ledger.com/

## Challenge

Le challenge s'articule majoritairement autour des interractions apdu.
1 - Le joueur active le hidden mode avec un apdu spécifique
2 - Cela active un nouveau handler d'apdu qui va vérifier le flag, passer dans le même apdu
3 - Ils envouent l'APDU pour dire print_flag qui va l'afficher sur l'écran.

