---
name: Métadonnées société dans l’état partagé
description: Le bootstrap peut enrichir la collection des sociétés à partir du registre serveur avant une sauvegarde globale.
---

Pour les comptes employee et sector_manager, les métadonnées de la collection `companies` sont en lecture seule. Le bootstrap peut les enrichir depuis le registre de sociétés, même si le snapshot persistant contient encore une valeur historique. Une sauvegarde staff doit donc ignorer cette différence lors de l’autorisation, puis conserver l’état serveur au merge au lieu d’accepter la copie client.

**Why:** Le client envoie un snapshot complet. Comparer la collection hydratée à sa version persistée rejette autrement des mutations autorisées d’employés ou de rôles; accepter la copie client permettrait en revanche d’écraser les métadonnées de l’entreprise.

**How to apply:** Toute évolution du bootstrap ou de la sauvegarde doit garder les deux garanties ensemble : exclure `companies` de la comparaison de mutation staff et de leurs collections fusionnables. Tester en chargeant le vrai bootstrap, puis en sauvegardant un rôle et un employé tout en falsifiant la métadonnée client; les enregistrements métier doivent réussir et les métadonnées serveur rester intactes.