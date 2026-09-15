---
name: Synchronisation rôles et comptes
description: Les permissions d’un rôle MAXIMUS doivent être recopiées dans le compte authentifié de chaque employé affecté.
---

Les droits affichés dans l’espace entreprise et les droits appliqués par les API ne partagent pas automatiquement la même persistance : le rôle métier est dans l’état MAXIMUS, tandis que l’autorisation serveur de connexion est dans le compte employé. Toute modification d’un rôle doit donc synchroniser les comptes affectés avant de confirmer la modification locale.

**Why:** Un compte de production peut conserver uniquement `voir` alors que l’interface d’un rôle affiche `créer` et `modifier`, ce qui rend les boutons visibles mais provoque un `403` sur l’API.

**How to apply:** Lorsqu’un rôle existant est enregistré, reprovisionner chaque compte employé affecté avec ses secteurs, son type de compte et les permissions normalisées du rôle. Ne jamais retirer le contrôle serveur pour masquer cette divergence.