---
name: Photos catalogue e-commerce
description: Convention de remplacement des URLs d’images par des fichiers téléversés.
---

Les photos des produits et des locations sont choisies comme fichiers dans le catalogue, enregistrées côté serveur par entreprise, puis exposées publiquement via une route API d’image. Le remplacement supprime l’ancienne copie; aucun nouvel élément ne doit dépendre d’une URL externe saisie par l’utilisateur.

**Why:** Une URL externe peut disparaître, changer de contenu ou pointer vers une ressource non maîtrisée, alors qu’une photo de catalogue doit rester liée à l’élément et à son tenant, y compris pour les locations autonomes.

**How to apply:** Conserver le contrôle de taille et de type MIME, rattacher chaque upload à l’entreprise résolue par la session, utiliser l’URL API publique retournée par le serveur dans la vitrine et l’espace client, et tester le remplacement.