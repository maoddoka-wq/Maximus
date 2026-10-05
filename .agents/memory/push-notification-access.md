---
name: Autorisation des notifications push
description: Politique MAXIMUS d’accès aux notifications push par entreprise et consentement individuel par navigateur.
---

MAXIMUS active ou désactive l’accès aux notifications push pour chaque entreprise. Une entreprise sans autorisation enregistrée est désactivée par défaut; les administrateurs d’entreprise ne peuvent pas accorder l’accès eux-mêmes. Le consentement du navigateur reste individuel et local à chaque appareil. La désactivation bloque les envois sans supprimer les abonnements individuels, et le son dans l’application reste indépendant. Les installations dédiées reçoivent l’autorisation centrale lors de leur prochaine synchronisation.

**Why:** l’utilisateur a demandé que l’accès push soit contrôlé par l’administration MAXIMUS, sans pouvoir remplacer le consentement de chaque personne.

**How to apply:** vérifier l’autorisation côté serveur à l’abonnement et lors de la sélection des destinataires; conserver la possibilité de désabonnement individuel même quand l’entreprise est bloquée. Synchroniser la décision vers les installations dédiées, sans effacer leur état local en cas d’absence temporaire du central.
