---
name: Snapshots des comptes staff
description: Pourquoi la validation des sauvegardes staff doit tolérer les cartes partagées inchangées sans autoriser leur modification.
---

Dans une sauvegarde complète, le client peut renvoyer des cartes partagées telles que les statuts et overrides de modules. Elles ne sont pas des collections indexées par liste. Comparer leur valeur à l’état courant avant d’appliquer la validation de forme des collections autorisées; accepter l’identique et refuser toute mutation.

**Why:** Une validation prématurée de forme peut rejeter toute sauvegarde d’un manager, même lorsque seules des collections métier autorisées changent.

**How to apply:** Lors d’une modification de l’autorisation `AppState`, couvrir le scénario où un manager crée un rôle/employé dans son périmètre avec des cartes inchangées, puis confirmer qu’une mutation d’une carte reste interdite.