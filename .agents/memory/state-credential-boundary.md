---
name: Frontend state credential boundary
description: Règle de nettoyage des credentials et des tenants historiques dans l’état partagé.
---

Les mots de passe ne doivent jamais être conservés dans l’état métier frontend ni dans `maximus_app_states`. Le serveur nettoie aussi les anciennes entrées avant bootstrap et élimine les collections rattachées à une entreprise absente ou archivée du registre actif.

**Why:** Une ancienne sauvegarde peut contenir un champ sensible ou un tenant supprimé même si le code actuel ne le produit plus.

**How to apply:** Nettoyer les credentials à l’entrée et à la sortie de l’état, dériver les entreprises actives du registre PostgreSQL, et tester un bootstrap MAXIMUS avec une entreprise archivée.