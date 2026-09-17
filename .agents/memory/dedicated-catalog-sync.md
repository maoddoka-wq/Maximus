---
name: Synchronisation du catalogue dédié
description: Règle de transfert du catalogue publié MAXIMUS central vers une installation dédiée.
---

Une installation dédiée doit recevoir séparément les définitions publiées du catalogue (modules personnalisés, fonctionnalités, packs, permissions, dépendances, overrides, statuts et version). La synchronisation locale ne remplace que ces clés dans `maximus_app_states` et conserve les données métier de l’installation.

**Why:** Render et l’installation locale ont des bases et des états distincts ; synchroniser uniquement l’entreprise et ses autorisations laisse les modules personnalisés ou les packs publiés inconnus localement.

**How to apply:** exposer `customModules` et `moduleOverrides` depuis l’état publié central, exclure `catalogDraft`, puis appliquer le catalogue avant toute validation de module ou de sélection côté Laravel.