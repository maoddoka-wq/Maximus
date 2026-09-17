---
name: URL canonique des bootstraps d’installation
description: Les fichiers bootstrap doivent pointer vers l’URL publique HTTPS stable de MAXIMUS central.
---

Le serveur central doit générer `centralUrl` depuis son URL publique canonique (`APP_URL`), et non depuis l’hôte ou le protocole de la requête entrante.

**Why:** derrière Render, la requête peut être reconstruite avec un ancien domaine ou `http`, ce qui envoie l’installation locale vers le mauvais serveur et provoque des `401` malgré un bootstrap fraîchement téléchargé.

**How to apply:** configurer `APP_URL` avec le domaine public HTTPS actif avant de générer un bootstrap ; après tout changement de domaine ou de jeton, générer un nouveau fichier et ne conserver qu’un seul bootstrap actif.