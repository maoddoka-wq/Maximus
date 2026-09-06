---
name: Séparation production et démonstration
description: Les données fictives doivent rester confinées au développement local et ne jamais alimenter le fallback production.
---

Les fixtures et comptes de démonstration ne doivent jamais être codés dans le frontend ou provisionnés par le runtime. La base Replit de démonstration est la seule source de ses données de démo ; le fallback et la production restent alimentés par leurs bases actives.

**Why:** Des fixtures locales présentes dans un store frontend peuvent être embarquées puis affichées sur une instance Render réelle, ce qui expose des comptes et fausse les données de l’entreprise.

**How to apply:** Toute nouvelle donnée de démo doit être ajoutée directement à la base de démonstration, jamais au bundle, aux routes actives ou à un seed versionné. Les données métier du frontend passent par l’API et la base active.