---
name: Séparation production et démonstration
description: Le mode explicite isole les jeux fictifs par entreprise et ne détourne jamais les flux de l’application Chauffeur.
---

Quand une entreprise active explicitement le mode Démonstration, son jeu fictif est initialisé dans la base active mais sous un périmètre distinct : un scope dédié pour l’app-state et un identifiant d’entreprise synthétique pour les tables métier. Le premier amorçage est transactionnel; les modifications sont conservées après désactivation et réactivation. Ne jamais afficher de fixtures locales du frontend ni amorcer les jeux fictifs au démarrage normal. L’application Chauffeur reste sur les données opérationnelles réelles; seuls les appels ERP web suivent le mode Démonstration.

**Why:** Le mode doit être utilisable dans le central comme dans une installation entreprise sans écraser les enregistrements réels ni dépendre d’une base Replit spéciale. Les chauffeurs actifs ne doivent pas perdre leurs courses ou envoyer leur GPS vers une identité synthétique.

**How to apply:** Toute nouvelle route métier ERP doit résoudre le dataset d’après la session entreprise et son en-tête, puis appliquer permissions et abonnements à l’entreprise réelle. Les mutations doivent cibler l’identifiant synthétique; les comptes réels, sites publics actifs et mouvements financiers restent protégés. Garder les appels avec jeton Chauffeur sur l’entreprise réelle et mettre les données de démo dans la base, jamais dans le bundle frontend.