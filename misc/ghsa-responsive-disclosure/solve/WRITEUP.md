# WriteUp — CVE Hunting & GitHub Security Advisory

**Catégorie :** Misc
**Difficulté :** Facile

---

## 📖 Énoncé

> Trouvez une vulnérabilité dans un dépôt GitHub au choix (≥ 1 mois),
> puis créez un GitHub Security Advisory (GHSA) via le processus officiel.

---

## 🔎 Étape 1 — Recherche d'un repo vulnérable via grep.app

On utilise **grep.app** pour chercher des patterns dangereux dans des dépôts publics réels.

**Pattern recherché :**
```
sk_live_
```

On filtre mentalement les résultats pour retenir un repo qui :
- A au moins **1 mois d'existence** (vérifiable dans l'onglet "About" du repo)
- Contient une clé **encore active** (non révoquée)
- A un **propriétaire joignable** (compte GitHub actif)

**Exemple de résultat trouvé :**

> `github.com/<REDACTED>/<REDACTED>` — fichier `<REDACTED>.js`, commitée il y a 6 semaines.

```javascript
const stripe = require('stripe')('sk_live_<REDACTED>');
```

---

## 🕵️ Étape 2 — Vérification & analyse de la vulnérabilité

Avant de signaler, on vérifie :

- **La clé est-elle encore dans le repo ?** → `git log` ou vue GitHub directe ✅
- **A-t-elle été révoquée ?** → On ne teste PAS la clé (éthique), on suppose qu'elle est active si toujours présente
- **Le repo a-t-il ≥ 1 mois ?** → Date du premier commit : 28 février 2025 ✅
- **Y a-t-il déjà un Advisory ouvert ?** → Onglet "Security" du repo → aucun ✅

**Classification de la vulnérabilité :**

| Champ | Valeur |
|---|---|
| Type | Hardcoded Credential / Secret Exposure |
| CWE | CWE-798 — Use of Hard-coded Credentials |
| Sévérité estimée | **High** (CVSS 8.1) |
| Impact | Accès non autorisé à l'API Stripe (lecture/écriture sur les paiements) |

---

## 📢 Étape 3 — Création du GitHub Security Advisory (GHSA)

### Processus officiel

1. Se rendre sur le repo cible :
   `https://github.com/<REDACTED>/<REDACTED>`

2. Aller dans l'onglet **Security** → **Advisories**

3. Cliquer sur **"Report a vulnerability"**
   *(bouton disponible si le propriétaire a activé les Private Security Reports)*

4. Remplir le formulaire :

```
Title:
  Hardcoded Stripe Live API Key exposed in <REDACTED>.js

Description:
  A Stripe live secret key (sk_live_*) is hardcoded directly in the
  source file `<REDACTED>.js` and has been publicly visible for over
  6 weeks. Anyone with access to this repository can use this key to
  perform authenticated requests to the Stripe API on behalf of the
  account owner, including reading customer data and initiating charges.

Affected versions: all (since initial commit)

Severity: High

CWE: CWE-798

Suggested fix:
  - Revoke the exposed key immediately from the Stripe dashboard.
  - Move the key to an environment variable (process.env.STRIPE_SECRET_KEY).
  - Add .env to .gitignore.
  - Consider adding a pre-commit hook (truffleHog, gitleaks) to prevent future leaks.
```

5. Soumettre → GitHub génère un identifiant **GHSA-xxxx-xxxx-xxxx**

### Preuve de soumission

> `GHSA-xxxx-xxxx-xxxx` — créé le 07 mai 2026, statut : **Draft / Awaiting maintainer review**

Lien à envoyer sur le Discord : https://github.com/REDACTED/REDACTED/security/advisories/GHSA-xxxx-xxxx-xxxx

---

## 🛠️ Remediation recommandée

```javascript
// ❌ Before
const stripe = require('stripe')('sk_live_<REDACTED>');

// ✅ After
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
```
```
# .gitignore
.env
```

Immediate actions for the maintainer:
1. **Revoke** the key on dashboard.stripe.com → Developers → API Keys
2. **Generate** a new key
3. **Purge** git history with `git filter-repo` if necessary

---

## 📚 Références

- [grep.app](https://grep.app/) — Recherche de code sur GitHub
- [GitHub Docs — Private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
- [CWE-798 — Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [OWASP A02:2021 – Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)
- [gitleaks](https://github.com/gitleaks/gitleaks) — Détection de secrets dans git

---

## ✅ Checklist de rendu

- [ ] Repo identifié avec date de création ≥ 1 mois
- [ ] Vulnérabilité documentée (fichier, ligne, nature)
- [ ] GHSA soumis via le processus officiel GitHub
- [ ] Identifiant GHSA-xxxx noté

Flag (remis par les auteurs) : `BZHCTF{r34l_w0rld_ghsa_disclosure}`
