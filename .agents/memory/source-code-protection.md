---
name: Protection du code source
description: Décision d’architecture pour éviter de livrer le code MAXIMUS aux entreprises qui contrôlent leur serveur.
---

Les installations destinées à un serveur appartenant à une entreprise ne doivent pas copier le code source Laravel ou le frontend MAXIMUS. Le déploiement source-based reste désactivé jusqu’à la disponibilité d’un connecteur local limité.

**Why:** Un administrateur qui contrôle la machine peut lire les fichiers nécessaires à l’exécution, inspecter les processus ou sauvegarder le disque. Une installation PHP complète ne permet donc pas de garantir la confidentialité du code sur un serveur client.

**How to apply:** Garder MAXIMUS central pour l’interface et les règles métier sensibles. Un futur connecteur local doit être limité, signé et communiquer uniquement en sortie avec une portée d’entreprise stricte. Ne jamais réactiver l’ancien installateur Laravel pour un client sans décision explicite et solution de protection validée.