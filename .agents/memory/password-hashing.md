---
name: Performance authentification
description: Règle de compatibilité et de performance pour les mots de passe MAXIMUS.
---

Les nouveaux mots de passe MAXIMUS utilisent un hash bcrypt calibré. Les anciens hash scrypt restent vérifiables une fois, puis sont remplacés automatiquement par le nouveau format après une connexion réussie. Le provisionnement des comptes démo les convertit également.

**Why:** La vérification scrypt historique prenait plusieurs secondes par connexion dans le runtime PHP et bloquait fortement l’interface.

**How to apply:** Toute création ou mise à jour de mot de passe doit passer par `MaximusPassword`. Ne pas supprimer la branche de vérification legacy tant que les comptes persistants n’ont pas tous été migrés.