---
name: Protection d’origine des sessions API
description: Règles de protection CSRF pour les sessions navigateur MAXIMUS et boutique.
---

Pour les mutations API, exiger une origine `Origin` ou `Referer` de même origine (ou explicitement autorisée) lorsque la requête transporte un cookie de session. Ne pas imposer cette vérification aux appels machine sans cookie, notamment ceux authentifiés par Bearer. Pour les aperçus Replit, ne faire confiance qu’aux origines HTTPS dérivées des hôtes exacts fournis par l’environnement; ne jamais utiliser de joker ni déduire une origine fiable d’un en-tête `Forwarded`.

**Why:** Les sessions navigateur doivent résister aux requêtes CSRF, tandis que les synchronisations machine peuvent être inter-origines et ne reposent pas sur les cookies du navigateur. Derrière le proxy Replit, l’origine publique du navigateur peut différer de l’hôte interne vu par Laravel; les hôtes d’aperçu déclarés fournissent la frontière de confiance exacte.

**How to apply:** Conserver cette frontière lors de l’ajout de routes et de domaines de boutiques. Utiliser la liste exacte des hôtes d’aperçu pour le proxy Replit; n’accepter aucune variante de sous-domaine non déclarée.