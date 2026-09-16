---
name: Connexion entreprise personnalisée
description: Règle de gouvernance et de sécurité pour les pages de connexion propres à chaque entreprise.
---

MAXIMUS conserve l’autorité sur l’autorisation du mode personnalisé ; chaque entreprise choisit ensuite entre la connexion MAXIMUS actuelle et sa page de connexion marquée. Les deux modes utilisent la même authentification serveur, et l’entreprise est toujours résolue par un slug serveur avant la vérification du mot de passe.

**Why:** Une page personnalisée ne doit pas créer un second système de comptes ni permettre à un navigateur de choisir librement le tenant.

**How to apply:** Garder le mode standard comme valeur par défaut, conserver un slug stable généré depuis le nom, invalider le mode personnalisé quand MAXIMUS retire l’autorisation, et ne jamais faire confiance à un `companyId` fourni par le client pour délimiter une connexion.