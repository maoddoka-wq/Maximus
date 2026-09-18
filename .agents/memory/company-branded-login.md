---
name: Connexion entreprise personnalisée
description: Règle de gouvernance et de sécurité pour les pages de connexion propres à chaque entreprise.
---

Sur l’hébergement mutualisé, MAXIMUS conserve l’autorité sur la connexion personnalisée : activation, mode et lien se gèrent dans l’administration des entreprises. L’entreprise est résolue par un slug serveur avant vérification du mot de passe. Sur une installation dédiée ou locale, la connexion entreprise est intrinsèque au mode d’installation et indépendante de l’autorisation facultative du mutualisé ; le serveur fixe l’entreprise, pas le slug.

**Why:** Une page personnalisée ne doit pas créer un second système de comptes ni permettre à un navigateur de choisir librement le tenant.

**Why:** La connexion dédiée ne doit pas être désactivée par une synchronisation des réglages du mutualisé. Les comptes locaux restent distincts ; le lien central historique n’est pas une solution de récupération du compte local.

**How to apply:** Garder le mode standard comme valeur par défaut, conserver un slug stable généré depuis le nom, invalider le mode personnalisé quand MAXIMUS retire l’autorisation, réserver les endpoints de réglage à `maximus_admin`, et ne jamais faire confiance à un `companyId` fourni par le client pour délimiter une connexion.

Sur une origine partagée, l’ouverture de n’importe quel lien `/entreprise/<slug>/connexion` avec une session MAXIMUS active doit fermer cette session avant d’afficher le formulaire du lien demandé.

**Why:** Sans cette étape, le routeur peut traiter le lien de l’entreprise B comme une route interne de l’entreprise A et afficher directement l’espace A.

**How to apply:** Détecter le conflit avant le rendu de l’espace authentifié, invalider l’état local et la session serveur, conserver l’URL du slug demandé, puis afficher la page de connexion sans se baser sur le slug présent dans un état métier potentiellement ancien.