# Allo Papa Tango Charlie


Gist:
- Maîtrise non-contrôlée du cryptosystème par l'utilisateur
- Le xor est involutif

Morale: 
En crypto, il faut garder les éléments maîtrisés par l'utilisateur au strict minimum. Et quand il est nécessaire de lui donner la main, il faut drastiquement contraindre l'espace des entrées possibles.

## Contrôle par l'utilisateur & involution

Premier réflexe : regarder l'assignation de la clef et du flag 
```python
FLAG = b"BZHCTF{FAKE_FLAG}"
assert len(FLAG) < 100, "Flag too long"

KEY = random.randbytes(len(FLAG))
```

`KEY` est complètement aléatoire. Mauvaise piste. Par contre, on apprend que `len(FLAG) < 100`. On a une borne supérieur sur la taille du flag. Pratique si on doit bruteforcer.


Passons à la fonction de chiffrement : 
```python
def gtfo_level(mesg, strength): 
    ciphered = mesg 
    shifted_key = list(KEY)

    # ...

    print(f"{strength=}")
    for _ in range(strength): 
        ciphered = [a ^ k for a,k in zip(ciphered, shifted_key)]
        shifted_key = [shifted_key[-1]] + shifted_key[:-1]
     
    # ...
```

Si on schématise ce chiffrement, pour un `strength=p` fixé : 
```
chiffrement(M) = M ^ K1 ^ K2 ^ ... ^ Kp
```

On note par ailleurs que l'utilisateur maîtrise `strength` avec (presque) aucune vérification. On peut choisir le nombre de "clefs" supplémentaires xorées sur le flag. 

Mais avec la ligne 
```python
        shifted_key = [shifted_key[-1]] + shifted_key[:-1]
```
on constate qu'en choisissant un `strength` suffisament grand, les masques vont boucler. En particulier `K_(len(FLAG))`, le masque à l'itération `len(FLAG)`, est le même que `K_0`, le tout premier masque appliqué. 

Sachant que `x ^ a ^ a = x`, en choisissant `strength=2*len(FLAG)=p`, le chiffrement devient 
```
chiffrement(M) = M ^ K1 ^ K2 ^ ... Kp ^ K1 ^ K2 ^ ... ^ Kp = M ^ K1 ^ K1 ^ K2 ^ K2 ^ ... ^ Kp ^ Kp = M
```

Le chiffré est le message en clair pour `strength=2*len(FLAG)`. 

On peut donc bruteforcer facilement ce nombre, sachant que le flag commence par `BZH`. 


