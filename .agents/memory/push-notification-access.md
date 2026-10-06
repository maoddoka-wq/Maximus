---
name: Autorisation des notifications push
description: Politique MAXIMUS d’accès aux notifications push par entreprise et consentement individuel par navigateur.
---

MAXIMUS active ou désactive l’accès aux notifications push pour chaque entreprise. Une entreprise sans autorisation enregistrée est désactivée par défaut; les administrateurs d’entreprise ne peuvent pas accorder l’accès eux-mêmes. Le consentement du navigateur reste individuel et local à chaque appareil. La désactivation bloque les envois sans supprimer les abonnements individuels, et le son dans l’application reste indépendant. Les installations dédiées reçoivent l’autorisation centrale lors de leur prochaine synchronisation.

Le réglage central se trouve dans MAXIMUS → Entreprises → fiche de l’entreprise → Accès & permissions. Quand MAXIMUS autorise une entreprise, son espace doit inviter ses utilisateurs à donner leur consentement sur leur navigateur ou appareil. La demande système ne peut être déclenchée qu’après une action explicite de l’utilisateur.

**Why:** l’utilisateur a précisé que l’autorisation par entreprise doit se trouver dans la fiche de l’entreprise, sous Accès & permissions, et non comme destination séparée. Les navigateurs exigent aussi un geste explicite avant d’afficher la demande système.

**How to apply:** placer le contrôle central dans l’onglet Accès & permissions de chaque fiche entreprise MAXIMUS, et signaler l’autorisation active dans l’espace entreprise. Vérifier l’autorisation côté serveur à l’abonnement et lors de la sélection des destinataires; garder un consentement individuel et révocable par appareil, même quand l’entreprise est bloquée. Synchroniser la décision vers les installations dédiées, sans effacer leur état local en cas d’absence temporaire du central.

Ne pas afficher de panneau de réglages locaux des notifications dans l’espace entreprise. Quand MAXIMUS autorise les notifications de l’entreprise, offrir deux demandes simples : un message flottant et une entrée dans la page ouverte par la cloche. Fermer le message flottant ne masque pas l’option de la cloche.

**Why:** Le 6 octobre 2026, l’utilisateur a demandé de retirer les réglages visibles partout, de garder deux moyens de demander le consentement et de ne les montrer que si MAXIMUS autorise l’entreprise.

**How to apply:** vérifier l’autorisation d’entreprise côté serveur avant d’afficher les deux demandes, ne jamais les montrer si l’autorisation manque, si l’appareil est déjà abonné ou si la demande correspondante a été repoussée, et exiger un clic explicite avant de demander l’autorisation du navigateur.
