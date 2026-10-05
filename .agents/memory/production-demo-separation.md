---
name: Séparation production et démonstration
description: Les données fictives doivent rester confinées au développement local et ne jamais alimenter le fallback production.
---

Quand une entreprise est en mode Démonstration, chaque module MAXIMUS doit afficher des données fictives adaptées à ce module. Les données de démonstration doivent rester séparées des données réelles : ne pas les coder dans le frontend ni les provisionner par le runtime. La base Replit de démonstration est la seule source de ses données de démo ; le fallback et la production restent alimentés par leurs bases actives.

**Why:** Le mode Démonstration doit permettre de présenter chaque module sans contaminer les données réelles. Des fixtures locales présentes dans un store frontend peuvent être embarquées puis affichées sur une instance Render réelle, ce qui expose des comptes et fausse les données de l’entreprise.

**How to apply:** Étendre le jeu de données de démonstration à chaque module et faire pointer l’entreprise de démonstration vers cette source isolée. Toute nouvelle donnée de démo doit être ajoutée directement à la base de démonstration, jamais au bundle, aux routes actives ou à un seed versionné. Les données métier du frontend passent par l’API et la base active.