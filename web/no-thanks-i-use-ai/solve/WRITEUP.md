# No thanks, I use AI - Writeup

## Contexte

- On a une app de messagerie instantanée nommée `PyroChat`.
- Elle est écrite en Python avec Flask.
- Il y a des routes user et des routes admin.
- Il y a un bot admin.
- Le flag est dans un fichier `/flag-<random-hex>.txt` sur le serveur.
- Le site a une CSP stricte: `script-src 'self'`.

## Analyse

Comme le flag est dans un fichier au nom aléatoire, on va probablement avoir besoin d'une RCE pour le lire.

Comme il y a un bot admin, des routes user, et des routes admin, on peut supposer qu'il va falloir:

1. Partir d'un accès user
2. Obtenir un accès admin via le bot (par exemple avec une XSS).
3. Exploiter la partie admin pour obtenir une RCE.
4. Exfiltrer le flag.

## XSS Sur le bot admin

### Upload de fichier SVG

L'application permet d'upload des fichiers avec `/api/upload`.
Ils sont ensuite servis avec `/uploads/<filename>`.
Le mimetype réel du fichier n'est envoyé que si il commence par `image/` (sinon, c'est `application/octet-stream`), et le header `X-Content-Type-Options: nosniff` est présent.

```py
@app.route("/uploads/<filename>")
@login_required
def uploaded_file(filename: str):
    ...
    mimetype = mimetypes.guess_type(filename)[0]
    if not mimetype or not mimetype.startswith("image/"):
        mimetype = "application/octet-stream"
        
    response = send_from_directory("uploads", filename, mimetype=mimetype)
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response
```

Cette vérification est insuffisante car elle accepte les fichiers SVG (`image/svg+xml`), qui peuvent contenir du code JavaScript.

On peut donc upload un fichier SVG contenant une balise `<script>`. Puis envoyer un message à l'administrateur avec un lien vers ce fichier pour le faire prévisualiser dans une iframe.

Cependant, la CSP b(`script-src 'self'`) empêche l'exécution du JavaScript dans l'iframe.

Pour contourner cetta CSP, on aurait besoin d'upload un fichier `.js` et de le charger avec `<script href="...">` dans notre SVG.
Mais l'endpoint `/uploads` empêche ça en forçant le mimetype à `application/octet-stream` et en ajoutant le header `X-Content-Type-Options: nosniff`.

### Path Traversal via Type Confusion & CSP bypass

Le code de `/api/upload` ressemble à ça:

```py
@app.route("/api/upload", methods=["POST"])
@login_required
def upload_file():

    data = request.json
    ...
    filename = data.get("filename")
    ...
    if any(s in filename for s in ("/", "\\", "..", "~")):
        return jsonify({"error": "Invalid filename"}), 400
    ...
    file_path = os.path.abspath(f"uploads/{filename}")
    with open(file_path, "wb") as f:
        f.write(file_content)
    ...
```

Il vérifie à la main que le nom du fichier ne contient aucune de ces séquences: `/`, `\`, `..`, `~`.
Cette vérification est solide pour les chaînes de caractères, mais comme `filename` est directement extrait de `request.json`, on peut lui envoyer une liste ou un dictionnaire JSON à la place.

On peut donc envoyer `{"filename": ['./../../static/payload.js']}`.
Le code vérifiera que `filename` ne contient pas les séquences interdites, ce qui est vrai pour une liste.
Ensuite, `file_path` sera égal à `os.path.abspath(f"uploads/{filename}")`, ce qui donnera `os.path.abspath("uploads/['./../../static/payload.js']")`, soit `uploads/['./../../static/payload.js']`, qui est égal à `static/payload.js']`.

Ca nous permet donc d'écrire un fichier dans le dossier `static`, qui est servi par l'application.
Comme le fichier est suffixé par `']`, il sera servi avec le mimetype `application/octet-stream`, cependant, contrairement à l'endpoint `/uploads`, il n'y a pas de header `X-Content-Type-Options: nosniff` ajouté, ce qui nous permet de le charger avec `<script href="/static/payload.js']" />` dans notre SVG (car le navigateur va deviner su'il s'agit d'un fichier JavaScript).

## RCE

### Arbitrary file write

Une fois admin, on a accès à plusieurs endpoints d'administration, dont `/api/admin/files/move`:

```py
@admin_bp.route("/api/admin/files/move", methods=["POST"])
@admin_required
def move_file():
    data = request.json or {}
    filename = data.get("filename")
    new_filename = data.get("newFilename")

    if filename not in get_uploads(): # get_uploads() liste les fichiers dans le dossier uploads (donc c'est safe)
        return jsonify({"error": "File not found"}), 404

    if not new_filename:
        return jsonify({"error": "Missing new_filename"}), 400

    src_path = os.path.abspath(f"uploads/{filename}")
    dst_path = os.path.abspath(f"uploads/{new_filename}")

    while os.path.exists(dst_path):
        ... # Renomme le fichier

    shutil.move(src_path, dst_path)

    ...
```

Cet endpoint ne vérifie absoluement pas le contenu de `new_filename`
Cependant, il le renomme quand même si il y a déjà un fichier du même nom.
En envoyant une payload comme `"newFilename": "../some_file_name"`, on peut donc écrire un fichier n'importe où, tant qu'il n'y a pas déjà un fichier du même nom à cet endroit.

### Python Library Hijacking

On peut donc ajouter un fichier n'importe où sur le système, mais pas écraser ceux existants.
On ne peut donc pas réecrire un fichier python de l'app ni une template (dommage).

En revanche, on peut créer un fichier `flask.py` dans le répertoire de l'app.
Au prochain redémarrage de l'app, le module `flask` sera importé depuis ce fichier au lieu de la vraie librairie Flask, ce qui nous donnera une RCE.

Et comme l'app est lancée avec l'option `--max-requests 100` de Gunicorn, on a juste à envoyer 100 requêtes pour forcer l'app à redémarrer.

## Exploitation

Pour exploiter tout ça il faut donc:

1. Créer un compte
2. Uploader un fichier `payload.py` contenant le code Python qui exfiltre le flag.
3. Uploader un fichier SVG contenant `<script href="/static/payload.js']" />`
4. Uploader un fichier JavaScript donc le nom est `['./../../static/payload.js']` (liste JSON) qui contient le code pour déplacer `payload.py` vers `../flask.py`.
5. Envoyer un message à l'administrateur avec un lien vers le fichier SVG
6. Attendre 5s que le bot charge la SVG et exécute le JS pour déplacer `payload.py` vers `../flask.py`.
7. Envoyer 100 requêtes pour faire redémarrer l'application et exécuter notre `flask.py` malveillant.
8. Attendre que le flag arrive.

