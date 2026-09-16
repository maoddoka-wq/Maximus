---
name: Connexion entreprise personnalisée
description: Règle de gouvernance et de sécurité pour les pages de connexion propres à chaque entreprise.
---

MAXIMUS conserve l’autorité complète sur la connexion personnalisée : l’activation, le mode, le lien généré et toute configuration de domaine se gèrent uniquement dans la section MAXIMUS des entreprises, jamais dans le profil de l’entreprise. Les deux modes utilisent la même authentification serveur, et l’entreprise est toujours résolue par un slug serveur avant la vérification du mot de passe.

**Why:** Une page personnalisée ne doit pas créer un second système de comptes ni permettre à un navigateur de choisir librement le tenant.

**How to apply:** Garder le mode standard comme valeur par défaut, conserver un slug stable généré depuis le nom, invalider le mode personnalisé quand MAXIMUS retire l’autorisation, réserver les endpoints de réglage à `maximus_admin`, et ne jamais faire confiance à un `companyId` fourni par le client pour délimiter une connexion.