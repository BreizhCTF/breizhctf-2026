# Online Robbery - Writeup

## Contexte

On a le site web d'une banque en ligne.
Le but est d'avoir 1 000 000 €.
On peut créer des comptes, qui ont un solde de 0€.
Il y a des comptes pré-créés, qui ont de l'argent.
Les sessions sont gérées par des JWT.

## Actuator exposé

L'application utilise `Spring Boot Actuator`, et expose tous les endpoints:

```properties
management.endpoints.web.exposure.include=*
```

Il y a notamment l'endpoint `/actuator/heapdump` qui permet de récupérer un dump de la mémoire de l'application.

## ATO via JWT Forgery

En analysant le dump de mémoire, on trouve une clé secrète utilisée pour signer les JWT (`javax.crypto.spec.SecretKeySpec#key`), on peut donc s'en servir pour forger un JWT et se connecter en tant que n'importe quel utilisateur. On a donc accès aux 2 comptes pré-créés, qui ont 100 et 50 €.

## Duplication via ReDoS + Race Condition

En analysant le code source de l'application, on remarque une Race Condition lors d'un virement (`BankService.performTransfer()`).

Cependant, une protection ("Rate Limit") au niveau du `BankController` limite les requêtes à 1 toutes les 100 ms (via `Bucket4j`). Une attaque classique par concurrence est donc bloquée par ce mécanisme.

Pour contourner ce limiteur, on peut s'appuyer sur la validation du message du virement :

```java
public boolean containsRestrictedContent(String message) {
        if (message == null) return false;
        return message.matches("\\b(?:https?://|[\\w.%+-]+@)(?!(?:[\\w-]+\\.)*thunely\\.bzh\\b)(?:(?:[\\w-]+\\.)+|(?:[\\w-.]+\\.)+)+[\\w-]{2,4}\\b");
    }
```

Cette fonction `containsRestrictedContent(message)` utilise un regex vulnérable à un ReDoS. En fournissant un message spécifiquement conçu comme `"a@" + ("a." * 23)`, l'évaluation de la regex prend plusieurs centaines de millisecondes.

**Scénario d'exploitation (TOCTOU) :**

1. L'objet `User` et son solde (ex: 150 €) sont récupérés en base de données au tout début de la requête par le `JwtAuthenticationFilter`.
2. On envoie une première requête de virement (ex: 150 € vers `bot_0`) avec le message malveillant. Elle passe le rate-limit, constate que les fonds sont suffisants, puis reste bloquée sur l'évaluation de la regex.
3. 100 ms plus tard, on envoie une seconde requête (ex: vers `bot_1`). Elle passe le rate-limit (100 ms se sont écoulées). Comme la première requête n'est pas encore terminée et n'a pas déduit l'argent en base, le filtre récupère à nouveau le solde initial de 150 €. Elle vérifie les fonds et bloque sur la regex à son tour.
4. On répète l'opération avec 8 bots. Les requêtes s'empilent, toutes bloquées sur le Thread par le ReDoS.
5. Lorsque les regex de chaque Thread se débloquent, les 8 requêtes exécutent et sauvegardent leur état :

    ```java
    sender.setBalance(sender.getBalance().subtract(amount));
    recipient.setBalance(recipient.getBalance().add(amount));
    userRepository.save(sender);
    userRepository.save(recipient);
    ```

6. Le compte de Bob fini avec un solde mis à jour à 0€ pour chaque transaction concurrente, mais les 8 bots voient chacun leur compte crédité de 150€.

L'argent vient d'être dupliqué ! On renvoit l'argent vers Bob et on répète le processus en boucle jusqu'à ce que le compte atteigne plus de 1 000 000 € pour récupérer le flag sur le Dashboard final.

Exploitation complète: [solve.py](solve.py)
