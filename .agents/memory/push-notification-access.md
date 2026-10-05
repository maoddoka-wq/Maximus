---
name: Autorisation des notifications push
description: Politique MAXIMUS d’accès aux notifications push par entreprise et consentement individuel par navigateur.
---

MAXIMUS active ou désactive l’accès aux notifications push pour chaque entreprise. Une entreprise sans autorisation enregistrée est désactivée par défaut; les administrateurs d’entreprise ne peuvent pas accorder l’accès eux-mêmes. Le consentement du navigateur reste individuel et local à chaque appareil. La désactivation bloque les envois sans supprimer les abonnements individuels, et le son dans l’application reste indépendant. Les installations dédiées reçoivent l’autorisation centrale lors de leur prochaine synchronisation.

Le réglage central doit être facile à trouver dans MAXIMUS. Quand MAXIMUS autorise une entreprise, son espace doit inviter ses utilisateurs à donner leur consentement sur leur navigateur ou appareil. La demande système ne peut être déclenchée qu’après une action explicite de l’utilisateur.

**Why:** l’utilisateur a demandé que l’accès push soit contrôlé et trouvable dans MAXIMUS, sans remplacer le consentement individuel. Les navigateurs exigent un geste explicite avant d’afficher la demande d’autorisation système.

**How to apply:** exposer le contrôle central dans la navigation MAXIMUS et signaler l’autorisation active dans l’espace entreprise. Vérifier l’autorisation côté serveur à l’abonnement et lors de la sélection des destinataires; garder un consentement individuel et révocable par appareil, même quand l’entreprise est bloquée. Synchroniser la décision vers les installations dédiées, sans effacer leur état local en cas d’absence temporaire du central.
