---
name: Synchronisation du catalogue dédié
description: Règle de transfert du catalogue publié MAXIMUS central vers une installation dédiée.
---

Une installation dédiée doit recevoir séparément les définitions publiées du catalogue (modules personnalisés, fonctionnalités, packs, permissions, dépendances, overrides, statuts et version). La synchronisation locale ne remplace que ces clés dans `maximus_app_states` et conserve les données métier de l’installation.

**Why:** Render et l’installation locale ont des bases et des états distincts ; synchroniser uniquement l’entreprise et ses autorisations laisse les modules personnalisés ou les packs publiés inconnus localement.

**How to apply:** exposer `customModules` et `moduleOverrides` depuis l’état publié central, exclure `catalogDraft`, puis appliquer le catalogue avant toute validation de module ou de sélection côté Laravel.

Les appels sortants vers le central doivent prévoir un délai de connexion distinct et quelques retries bornés, car un réveil ou un changement d’instance Render peut provoquer un timeout transitoire alors que `/api/healthz` redevient rapidement disponible.

**Why:** une installation isolée ne doit pas échouer définitivement sur une seule interruption réseau ; les réponses HTTP d’erreur, notamment `401`, doivent toutefois rester visibles immédiatement.

**How to apply:** utiliser un retry court autour de la récupération de configuration, sans retry illimité ni contournement d’un jeton invalide.