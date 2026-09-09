---
name: Frontière des données Commerce
description: Règle de synchronisation des workflows commerciaux entre état local et données opérationnelles partagées.
---

Les écrans Commerce utilisent deux périmètres de données : l’état local par entreprise pour les clients, crédits, dépenses, caisses et retours, et StoreData pour les produits, ventes, achats, mouvements et journal. Toute opération commerciale qui traverse ces périmètres doit mettre à jour les deux explicitement.

**Why:** Une mise à jour dans un seul périmètre donne une interface qui semble fonctionner mais laisse le stock, le solde client ou l’historique incohérent après navigation ou rechargement.

**How to apply:** Avant d’ajouter un workflow Commerce, identifier son périmètre de persistance puis synchroniser l’autre périmètre dans la même action utilisateur, avec confirmation pour les changements irréversibles. Un règlement doit notamment maintenir ensemble la vente, la créance, le solde client et la caisse concernés.