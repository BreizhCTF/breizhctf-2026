# Online Robbery

- **Auteur** : [crazycat256](https://crazycat256.fr)
- **Catégorie** : Web
- **Difficulté** : Moyen

## Description

Cette banque en ligne affirme dans ses pubs qu'en l'utilisant, il est possible
de devenir riche !! Une intuition vous dit qu'elle ne croit pas si bien dire...

## Build / Run

```bash
cd src
docker build -t online-robbery .
docker run --rm -p 5000:8080 online-robbery
```

## Regénération des fichiers joueur

```bash
./gen_files.sh
```

## Tags

- Moyen
- Java
- Web
