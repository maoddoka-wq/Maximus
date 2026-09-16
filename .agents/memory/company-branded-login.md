---
name: Connexion entreprise personnalisée
description: Règle de gouvernance et de sécurité pour les pages de connexion propres à chaque entreprise.
---

MAXIMUS conserve l’autorité complète sur la connexion personnalisée : l’activation, le mode, le lien généré et toute configuration de domaine se gèrent uniquement dans la section MAXIMUS des entreprises, jamais dans le profil de l’entreprise. Les deux modes utilisent la même authentification serveur, et l’entreprise est toujours résolue par un slug serveur avant la vérification du mot de passe.

**Why:** Une page personnalisée ne doit pas créer un second système de comptes ni permettre à un navigateur de choisir librement le tenant.

**How to apply:** Garder le mode standard comme valeur par défaut, conserver un slug stable généré depuis le nom, invalider le mode personnalisé quand MAXIMUS retire l’autorisation, réserver les endpoints de réglage à `maximus_admin`, et ne jamais faire confiance à un `companyId` fourni par le client pour délimiter une connexion.

Sur une origine partagée, l’ouverture de n’importe quel lien `/entreprise/<slug>/connexion` avec une session MAXIMUS active doit fermer cette session avant d’afficher le formulaire du lien demandé.

**Why:** Sans cette étape, le routeur peut traiter le lien de l’entreprise B comme une route interne de l’entreprise A et afficher directement l’espace A.

**How to apply:** Détecter le conflit avant le rendu de l’espace authentifié, invalider l’état local et la session serveur, conserver l’URL du slug demandé, puis afficher la page de connexion sans se baser sur le slug présent dans un état métier potentiellement ancien.