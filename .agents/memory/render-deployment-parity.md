---
name: Render deployment parity
description: Vérification de la version réellement servie par Render quand autoDeploy est désactivé.
---

Render peut continuer à servir un ancien bundle même lorsque le workspace local est corrigé : `autoDeploy: false` impose une publication manuelle, et un push GitHub authentifié est nécessaire si Render suit le dépôt distant.

**Why:** Une correction locale validée ne corrige pas la boutique publique tant que le commit n’est pas disponible sur la branche suivie par Render puis déployé manuellement.

**How to apply:** Comparer les noms de bundles statiques servis par le domaine public avec ceux produits localement, puis vérifier le commit actif dans Render avant d’analyser à nouveau un bug de production.