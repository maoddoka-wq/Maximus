---
name: Installations isolées
description: Décisions de sécurité et d’amorçage pour les instances MAXIMUS dédiées ou locales.
---

Le mode `central` reste la valeur par défaut. Les modes `dedicated` et `on_premise` doivent fixer l’identifiant de l’entreprise dans la configuration serveur, refuser les routes centrales et n’amorcer qu’un compte `company_admin`.

**Why:** Une installation client ne doit pas pouvoir exposer l’administration de la plateforme ni permettre au navigateur de choisir une autre entreprise.

**How to apply:** Utiliser le contexte d’installation côté serveur pour filtrer l’authentification, les routes globales et le périmètre entreprise ; conserver un bootstrap idempotent et non destructif après les migrations, y compris lors de la préparation de `.env`, et ne jamais appeler le provisionnement de l’administrateur MAXIMUS global dans ces modes.