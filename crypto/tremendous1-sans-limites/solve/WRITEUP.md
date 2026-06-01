# Tremendous 1 : Accès VIP - Sans limites

**Gist**
Échange de clef Shamir, mais on a oublié le modulo. On transforme un problème hyper-complexe en un problème d'équations linéaires. 

## Solution 

### Shamir en théorie 

Une instance de (k,n)-Shamir sert à générer un ensemble {S1, ..., Sn} de sous-secret tels que 
- posséder >= k sous-secrets permet la reconstitution du secret principal S ;
- posséder < k ne permet pas de calculer S (ou de déduire des informations sur S). 

Pour un vrai Shamir, choisir le secret S, un premier p, et n entiers {a1, ..., an}, construire le polynome P = S + a1.x + ... + an.x^n.

Distribuer les sous-secrest $(xi, Si = P(xi))$, où les $xi$ sont des valeurs distinctes.

On peut reconstruire S à partir de k valeur par interpolation (allez sur la page Wikipedia. En markdown, la formule sera trop moche). 

Et on ne peut pas avec moins de points à cause des modulos.


### Shamir ici 

On n'a qu'un sous-secret, mais on a oublié les modulos. 
Comme $x$ est gros (plus gros que tous les coefficients), $P(x) mod x = a0 = S$.

