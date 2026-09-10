---
name: Source de vérité des autorisations modules
description: Règle de distinction entre demande d’inscription et activation effective d’un module pour une entreprise.
---

L’autorisation effective d’un module doit être reconstruite depuis les lignes d’accès persistées de l’entreprise. `requested_modules` décrit uniquement les modules demandés lors de l’inscription et peut être incomplet après une activation ou une désactivation faite par MAXIMUS.

**Why:** Une entreprise peut recevoir un module après son inscription. Utiliser uniquement la demande initiale masque alors un module pourtant actif côté serveur.

**How to apply:** Pour charger un espace entreprise, utiliser les statuts d’accès persistés (`ACTIF`/`BETA`) avec un repli sur la demande initiale uniquement lorsqu’aucune ligne d’accès n’existe encore.