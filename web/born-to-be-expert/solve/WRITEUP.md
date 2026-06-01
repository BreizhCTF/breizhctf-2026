# Born to be Expert — Web

Le site génère des diplômes PNG après avoir répondu à un quiz.
Le endpoint `POST /api/diploma` prend un champ `name` dont la valeur apparaît dans le diplôme sous forme d'ascii-art.

En testant le payload `test' injected`, l'image retournée contient une erreur shell, on peut en déduire que que le nom est concaténé dans une commande shell avec des single-quotes.

On ferme la single-quote et on chaîne une commande :

```
'; cat /flag-*.txt; echo '
```

La sortie de `cat` est capturée et rendue dans le diplôme PNG.

```bash
python3 solve.py --host <ip> --port <port>
# Flag visible dans flag.png
```
