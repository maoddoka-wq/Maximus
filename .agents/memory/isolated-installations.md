---
name: Installations isolées
description: Décisions de sécurité et d’amorçage pour les instances MAXIMUS dédiées ou locales.
---

Le mode `central` reste la valeur par défaut. Les modes `dedicated` et `on_premise` doivent fixer l’identifiant de l’entreprise dans la configuration serveur, refuser les routes centrales et n’amorcer qu’un compte `company_admin`.

MAXIMUS principal est la source de vérité du périmètre installé : l’instance dédiée s’enrôle par jeton, récupère les modules, permissions et domaines validés, puis synchronise périodiquement ces décisions par HTTPS. Les employés et les données métier restent locaux.

**Why:** Une installation client ne doit pas pouvoir exposer l’administration de la plateforme ni permettre au navigateur de choisir une autre entreprise.

**Why:** Une copie de configuration au moment de l’installation ne permet pas à MAXIMUS de retirer un domaine ou un module après coup ; le lien central doit donc rester disponible, sans transformer les opérations quotidiennes des employés en appels centraux.

**How to apply:** Utiliser le contexte d’installation côté serveur pour filtrer l’authentification, les routes globales et le périmètre entreprise ; enrôler avec un jeton privé, synchroniser les autorisations et domaines, conserver un bootstrap idempotent et ne jamais appeler le provisionnement de l’administrateur MAXIMUS global dans ces modes.

La révocation du jeton coupe les synchronisations, pas le fonctionnement local déjà autorisé. Une panne centrale ne doit ni expirer les comptes locaux, ni réinitialiser leurs mots de passe au démarrage.

**Why:** L’autonomie locale demandée exclut une dépendance quotidienne au serveur central ; une suspension distante ne peut être connue hors ligne. Ne pas promettre d’arrêt immédiat lors d’une révocation.

**How to apply:** Conserver la dernière configuration valide, distinguer panne réseau et refus de synchronisation, prévoir une récupération d’administrateur sur le serveur local sans créer de compte global.

Créer une installation de préparation ne ferme pas l’accès mutualisé. La bascule des employés demande une confirmation explicite après validation locale, sans supprimer leurs anciens comptes. Son rétablissement est également explicite.

**Why:** Une entreprise doit pouvoir tester et préparer plusieurs installations sans interrompre le service courant ; une panne de la destination ne doit pas réactiver implicitement un second environnement de comptes.

**How to apply:** Séparer le choix d’accès principal des statuts de domaines et de jetons ; conserver l’accès global MAXIMUS pour administrer et rétablir ce choix.