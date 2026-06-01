# Tremendous 2 : Bâbord, Tribord et Requins

**Gist**: 
Le "vérificateur de bord" sert d'oraclie de parité (*ie.* leak le LSB du déchiffré). Et RSA est homomorphe par la multiplication. On peut utiliser l'oracle pour bruteforcer le message en clair par dichotomie. 

## Solution


### Données à notre disposition, et constant de faiblesse du code 

Le code de l'app python est minimal. Le déchiffrement RSA se fait à l'arrache avec `m = pow(c, D, N)`. Le serveur renvoie 'bâbord' si le LSB du déchiffré est 0, 'tribord' si 1. 

Or, avec cette version mathématique de RSA, si j'envoie le chiffré `C' = 2^e * C [N]`, le serveur va déchifrer `M' = 2M [N]` (où `e, N` sont les paramètres publiques de chiffrement).

Dans ce challenge, on a accès à un leak : le chiffré du mot de passe du capitaine. On a donc un `C0` qu'on veut attaquer, et en trouver le claire `M0`. 


### RSA, N, et leak du LSB

`N` est le produit de deux premiers (inconnus). Il est impaire. 

Pour `C1 = 2^e * C0` en entrée, après ses calculs, le serveur nous donnera le Least Significant Bit (LSB) de `2M`. Deux cas possibles

- Ou bien `2M < N`. Alors `2M` est pair, le serveur réponds 0 ;
- ou bien `2M > N`, alors le serveur travaille sur `2M - N`, qui est impaire et répond 1 ;
- Le cas `2M = N` n'est pas possible, car N est produit de deux gros premiers.

Après la première itération, on peut affirmer dans quelle intervalle -- `]0; N/2[` ou `]N/2; N[` -- le clair se trouve. 
Puis on recommence avec `C2 = 2^e * C1`, et on reserre l'intervalle. Bref, dichotomie. 


### Implémentation 

Voir `solve.py`.
