---
name: Frontend state credential boundary
description: Règle de nettoyage des credentials et des tenants historiques dans l’état partagé.
---

Les mots de passe ne doivent jamais être conservés dans l’état métier frontend ni dans `maximus_app_states`. Le serveur nettoie aussi les anciennes entrées avant bootstrap et élimine les collections rattachées à une entreprise absente ou archivée du registre actif.

**Why:** Une ancienne sauvegarde peut contenir un champ sensible ou un tenant supprimé même si le code actuel ne le produit plus.

**How to apply:** Nettoyer les credentials à l’entrée et à la sortie de l’état, dériver les entreprises actives du registre PostgreSQL, et tester un bootstrap MAXIMUS avec une entreprise archivée.

Les réponses d’état partiel ou historiques doivent aussi être normalisées avant tout rendu : chaque collection métier attendue doit rester un tableau et chaque map métier doit rester un objet.

**Why:** Une valeur `null` ou une ancienne forme de payload faisait tomber les écrans Contrôle et Organisation au premier `map`, `filter` ou `Object.entries`.

**How to apply:** Passer tout bootstrap serveur par la normalisation partagée avant de l’exposer aux pages, sans remplacer les collections valides déjà présentes.