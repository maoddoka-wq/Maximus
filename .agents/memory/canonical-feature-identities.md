---
name: Identifiants canoniques des fonctionnalités
description: Règle de conversion des libellés, slugs et identifiants historiques avant l’affichage des modules.
---

Les sélections de fonctionnalités doivent être converties par les options canoniques du module avant d’alimenter les permissions, le menu latéral ou les onglets internes. Les identifiants de navigation restent distincts des slugs de permission.

**Why:** La réorganisation de l’administration MAXIMUS a pu laisser des valeurs persistées sous forme de libellés ou d’anciens alias. Les filtrer directement contre des identifiants modernes faisait disparaître des entrées ou désynchronisait le menu et la page.

**How to apply:** Faire passer toute sélection par la normalisation de `module-features`, conserver un libellé canonique pour le rendu, puis convertir séparément vers l’identifiant d’onglet dans chaque routeur.