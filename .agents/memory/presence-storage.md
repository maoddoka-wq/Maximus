---
name: Persistance des présences
description: Les objets de présence partagent une table PostgreSQL historisée et un payload extensible.
---

Les données de Gestion des Présences sont persistées dans PostgreSQL comme des éléments typés (`attendance`, `absence`, `schedule`, `planning`, `mission`, `leave`, `holiday`, `settings`, `history`) avec un payload JSONB et un journal des anciennes/nouvelles valeurs.

**Why:** Le module doit couvrir plusieurs workflows métier et évoluer avec les congés/RH sans remplacer le store local existant qui porte encore l’organisation et les employés.

**How to apply:** Toute nouvelle sous-fonction Présences doit utiliser l’API `/api/presence` et créer une entrée d’historique; ne pas réintroduire de données fictives ou une seconde persistance locale.