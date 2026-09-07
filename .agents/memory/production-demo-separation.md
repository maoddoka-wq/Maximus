---
name: Séparation production et démonstration
description: Les données fictives doivent rester confinées au développement local et ne jamais alimenter le fallback production.
---

Les fixtures et comptes de démonstration ne doivent jamais être codés dans le frontend ou provisionnés par le runtime. La base Replit de démonstration est la seule source de ses données de démo ; le fallback et la production restent alimentés par leurs bases actives.

**Why:** Des fixtures locales présentes dans un store frontend peuvent être embarquées puis affichées sur une instance Render réelle, ce qui expose des comptes et fausse les données de l’entreprise.

**How to apply:** Toute nouvelle donnée de démo doit être ajoutée directement à la base de démonstration, jamais au bundle, aux routes actives ou à un seed versionné. Les données métier du frontend passent par l’API et la base active.

Une réponse de santé Render indiquant seulement `database: true` prouve la connectivité, pas l’identité de la base ni la fraîcheur du bundle. Avec `autoDeploy: false`, comparer systématiquement le bundle public et le commit attendu avant d’attribuer une ancienne donnée à PostgreSQL.

**Why:** Un service peut rester connecté à PostgreSQL tout en servant une image Docker précédente ; les anciens modules et réglages semblent alors revenir alors qu’ils viennent de l’ancienne version déployée ou d’un ancien état applicatif persistant.

**How to apply:** Vérifier dans Render le service, la variable `DATABASE_URL` liée à `maximus-postgres`, le journal de migration et le bundle public avant toute correction de données.