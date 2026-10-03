---
name: Assistant local contrôlé
description: Principes de sécurité et d’évolution pour le copilote IA intégré à MAXIMUS.
---

L’assistant MAXIMUS est réservé à l’administration principale : il lit le catalogue global, les modules, fonctionnalités, packs, permissions, secteurs, entreprises et organisations, explique ses sources et ne déclenche aucune action métier dans les espaces entreprise.

**Why:** L’assistance de configuration et de gouvernance appartient à MAXIMUS ; les entreprises ne doivent pas recevoir de visibilité sur le fonctionnement global de la plateforme.

**How to apply:** Toute nouvelle capacité doit être branchée sur le contexte administratif global, produire une réponse observable avec ses sources, rester sans mutation implicite et ne jamais réintroduire de route ou d’entrée IA dans l’espace entreprise.

MAXI doit demander une validation « Avant chaque modification », même lorsqu’un objectif nécessite plusieurs étapes. Il peut préparer et organiser le travail, mais une approbation du plan entier ne vaut pas accord pour toutes ses modifications.

**Why:** L’utilisateur a choisi explicitement « Avant chaque modification » et demandé « le meilleur possible » pour l’évolution de MAXI.

**How to apply:** Présenter la portée de chaque étape avant sa confirmation, s’arrêter entre les modifications et préserver les résultats déjà confirmés en cas d’interruption ou d’abandon.

MAXI doit être autonome, sans API externe, et disposer de tout le savoir nécessaire à ses fonctions MAXIMUS.

**Why:** L’utilisateur a demandé « aucun api externe » et un MAXI « autonome entrainé sur tout ce qu’il doit savoir », remplaçant la solution Anthropic précédemment utilisée.

**How to apply:** Ne pas réactiver un fournisseur IA extérieur pour MAXI. Héberger son modèle sous contrôle MAXIMUS et actualiser ses connaissances depuis les sources métier autorisées ; conserver la validation humaine de chaque modification.