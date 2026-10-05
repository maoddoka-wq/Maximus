---
name: Séparation production et démonstration
description: Le mode explicite isole les jeux fictifs par entreprise et ne détourne jamais les flux de l’application Chauffeur.
---

Quand une entreprise active explicitement le mode Démonstration, son jeu fictif est initialisé dans la base active mais sous un périmètre distinct : un scope dédié pour l’app-state et un identifiant d’entreprise synthétique pour les tables métier. Le premier amorçage est transactionnel; les modifications sont conservées après désactivation et réactivation. Ne jamais afficher de fixtures locales du frontend ni amorcer les jeux fictifs au démarrage normal. L’application Chauffeur reste sur les données opérationnelles réelles; seuls les appels ERP web suivent le mode Démonstration.

Pour relier les fixtures aux employés existants, utiliser uniquement leur employeeId et leur identité d’affichage. Ne jamais modifier l’ID du compte, son mot de passe, son rôle ni ses permissions. Limiter les profils, tâches, présences et dossiers de paie de démonstration au périmètre de l’employé ou du secteur autorisé; une réactivation peut ajouter les nouveaux comptes éligibles, mais ne doit pas réinitialiser les fixtures déjà modifiées.

Le scope employé sert uniquement de marqueur : l’amorçage doit pouvoir se rejouer à chaque activation pour compléter les fixtures manquantes sans écraser les modifications existantes.

**Why:** Un marqueur peut survivre à une initialisation partielle; le traiter comme un verrou laisserait durablement certains employés sans fixtures. L’amorçage idempotent ajoute les éléments absents tout en conservant les éditions. Le mode doit aussi fonctionner dans le central et les installations entreprise, sans écraser les données réelles ni détourner les courses ou le GPS Chauffeur.

**How to apply:** Toute nouvelle route métier ERP doit résoudre le dataset d’après la session entreprise et son en-tête, puis appliquer permissions et abonnements à l’entreprise réelle. Les mutations doivent cibler l’identifiant synthétique; les lectures liées à un employé doivent aussi être filtrées côté serveur d’après son employeeId ou les secteurs autorisés. Pour les fixtures, réutiliser des identifiants stables et ajouter uniquement les éléments absents. Les comptes réels, sites publics actifs et mouvements financiers restent protégés. Garder les appels avec jeton Chauffeur sur l’entreprise réelle et mettre les données de démo dans la base, jamais dans le bundle frontend.