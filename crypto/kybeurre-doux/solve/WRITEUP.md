# Kybeurre doux

Gist:
- Donner accès à un oracle de déchiffrement de Kyber sans vérifications revient à donner la clef.

Morale: 
Même si on restreint l'utilisateur à des inputs valides de chiffré / déchiffré, la non-vérification de leur cohérence, et la persistance de données (ici la clef), permettent de soutirer des infos sur un chiffré ou sur la clef.


## C'est quoi la crypto ??? 

Vu le titre, c'est probablement Kyber. 

La fonction `encrypt` n'est pas utile à la résolution mais permet de voir de quoi on parle. 
Elle revient à faire les opérations mathématiques suivantes 
```
Enc(message, key) :
    bit_mesg = concaténation des bits de `message`
    
    Pour chaque bit b de bit_mesg
        Tirer un vecteur aléatoire A 
        Calculer b = A.Key + m + Q//2 + noise
    
    renvoyer la collection des A, b
```

C'est précisément le chiffrement de Kyber. Learning With Errors (LWE). L'idée derrière cette méthode est de dire "si j'ajoute du bruit (bien choisi), je peux masquer la vraie info". Avec le `+ Q//2`, on s'assure d'être toujours "sur la ligne de crête" pour le déchiffrement :

```
Dec1bit(Key, A, b) :
    mask = Key.A 
    res = b - mask 
    si res > Q // 4, renvoyer 1, sinon 0
```

(les opérations sont modulo Q).

### Laïus LWE 

Pourquoi du bruit ? 

Sans bruit, le chiffrement revient à 
`A*secret = chiffré`
Avec A public. Si on me donne `chiffré`, j'en déduis le secret trivialement.

Si j'ajoute du bruit 
`A*secret + bruit = chiffré`
On divulgue `A` et `chiffré`. Retrouver `secret` devient un problème particulièrement difficile (point le plus proche d'un réseau euclidien en grande dimension). 


## Lien avec le problème actuel 

Dans ce problème, le serveur nous donne un oracle de déchiffrement et nous laisse la main sur toutes les entrées sauf le secret 
```python

def decrypt_one_bit(clef_privee, A, b):
    # ...
    
    mask = sum([x*y for x, y in zip(clef_privee, A)]) % Q
    msg_bruite = (b - mask) % Q 
    msg_bruite = min(msg_bruite, Q-msg_bruite)

    return int(msg_bruite >= THRESHOLD)

```

On contrôle `A` et `b`. Les opérations réalisées sont `b - A.clef_privee`. 
En choisissant `A = [0, ..., 0, 1, 0, ..., 0]`, avec un 1 en i-eme position, la fonction nous renvoie `b - clef_privee.i >= THRESHOLD`. 
En itérant sur les valeurs possibles de `b`, la valeur de retour de la fonction passera de 0 à 1 lorsque `b = THRESHOLD + clef_privee.i`. 

*ie.* on peut bruteforcer la clef élément par élément. 

## Implémentation 

cf `solve.py`

## Mais comment on protège Kyber alors ? 

La fonction de `decrypt_one_bit` est proche d'un text-book Kyber. Dans la vraie vie, on travaille sur des anneaux un peu plus complexes, et pas bit par bit, mais l'idée reste la même. 
La vulnérabilité vient du fait qu'on ne vérifie pas la cohérence des paramètres fournis à l'oracle. 

Sur une vraie implém, on appliquerait probablement la transformée de Fujisaki-Okamoto (terme pompeux), soit en pseudo-code 
```
Decrypt_secure(A, b, clef_privee)

    candidat = Decrypt(clef_privee, A, b)
    (A', b') = Encrypt(candidat, pk, seed_deterministe)   <- on utilise l'aléatoire qui 'aurait dû être utilisé' dans le chiffrement originel

    Si (A', b') == (A, b): 
        renvoyer candidat 
    Sinon
        renvoyer "Truand !" (ou plus probablement, un faux secret pour ne pas leaker d'information)
```

Vu la re-vérification, aucune chance que nos (A, b) empoisonnés passent le check du re-chiffrement.
