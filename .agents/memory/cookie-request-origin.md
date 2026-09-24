---
name: Protection d’origine des sessions API
description: Règles de protection CSRF pour les sessions navigateur MAXIMUS et boutique.
---

Pour les mutations API, exiger une origine `Origin` ou `Referer` de même origine (ou explicitement autorisée) lorsque la requête transporte un cookie de session. Ne pas imposer cette vérification aux appels machine sans cookie, notamment ceux authentifiés par Bearer.

**Why:** Les sessions navigateur doivent résister aux requêtes CSRF, tandis que les synchronisations machine peuvent être inter-origines et ne reposent pas sur les cookies du navigateur.

**How to apply:** Conserver cette frontière lors de l’ajout de routes et de domaines de boutiques; n’ajouter une origine externe qu’à la liste autorisée explicite.