---
name: Migration Laravel progressive
description: Contraintes durables pour faire coexister Laravel et Express pendant la migration MAXIMUS.
---

Laravel doit rester parallèle et réversible tant que la parité avec Express n’est pas démontrée. Les migrations MAXIMUS peuvent être exécutées dans un environnement de développement isolé ; elles ne doivent pas recréer les tables déjà présentes ni déclencher le remplacement du workflow API actif.

**Why:** PostgreSQL reste la source de vérité de MAXIMUS et les comptes existants utilisent le format scrypt d’Express. Une bascule prématurée risquerait de casser les connexions ou les données.

**How to apply:** Tester les contrats Laravel sur SQLite local ou une base PostgreSQL de développement, comparer les réponses à Express, puis seulement planifier un changement de workflow et une migration de production.

Les catalogues de modules front et Laravel doivent partager un contrat testé, notamment pour les fonctionnalités et leurs dépendances.

**Why:** Une migration parallèle peut rester techniquement verte tout en exposant deux offres différentes à l’utilisateur si chaque runtime conserve sa propre définition.

**How to apply:** Toute évolution d’un module doit mettre à jour les deux représentations ou introduire une source de vérité partagée, puis ajouter un test de parité de catalogue avant la bascule.