---
name: Accès aux APK Chauffeur
description: Politique de publication et de téléchargement des versions Android Chauffeur.
---

Les releases APK Chauffeur doivent toujours être publiées, jamais laissées en brouillon. Dans le dépôt public, cela rend l’APK accessible publiquement.

**Why:** L’utilisateur a explicitement corrigé la règle précédente : « Il ne faut pas mettre en brouillon il faut toujours publié », puis « Toujours ».

**How to apply:** Configurer les workflows Android avec `draft: false`, puis vérifier après la construction que la release est publiée et que son APK est présent. Conserver les contrôles d’accès existants dans l’API MAXIMUS ; ils ne rendent pas privé l’asset d’une release publique GitHub.

Vérifier la configuration de publication dans le commit portant le tag ainsi que sur la branche par défaut ; ne pas déduire la visibilité finale du seul workflow local.

**Why:** Les historiques des tags APK et de la branche de développement peuvent diverger et contenir des configurations différentes.

**How to apply:** Contrôler le workflow effectivement utilisé et la visibilité réelle de la release après le run.