---
name: Accès direct aux docs API
description: Repli à essayer si la recherche ou l’extraction web intégrée échoue.
---

Pour consulter la documentation GitHub, `webFetch` et `webSearch` ont renvoyé une erreur 402, alors qu’un `fetch` HTTPS direct depuis CodeExecution a réussi.

**Why:** L’outil d’extraction peut échouer indépendamment de l’accès réseau direct de l’environnement.

**How to apply:** Pour une documentation publique, si les deux outils web échouent, tenter une récupération HTTPS directe dans une petite fonction `use impure` avant de conclure que la documentation est inaccessible.