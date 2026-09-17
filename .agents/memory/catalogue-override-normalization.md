---
name: Overrides de catalogue tolérants
description: Règle de robustesse pour les modules, packs et permissions issus d’anciens états persistés.
---

Les overrides de catalogue sont des données persistées et peuvent contenir des tableaux nuls, des packs incomplets ou des permissions mal formées. Ils doivent être normalisés à la frontière du store et à la frontière Laravel avant d’être fusionnés avec les modules intégrés ou utilisés pour valider une inscription. Le serveur doit valider avec les mêmes overrides publiés que ceux exposés au formulaire.

**Why:** un état ancien ou partiellement migré pouvait faire planter les écrans administratifs avec `.map()` ou `.flatMap()` et masquer toute la page derrière le fallback React générique ; un serveur qui ignorait ensuite ces overrides refusait aussi les identifiants de packs pourtant affichés par l’inscription.

**How to apply:** faire passer les écrans d’administration, d’inscription, de secteurs et de test de packs par le même module configuré normalisé, convertir les packs camelCase en forme serveur avant validation, puis couvrir les formes JSON incomplètes et les packs publiés remplacés par des tests de régression.

Les écrans d’administration qui modifient une entreprise doivent aussi charger les packs et fonctionnalités depuis le catalogue publié configuré, puis filtrer les sélections persistées avant de les renvoyer au serveur ; la constante des modules intégrés ne suffit pas.

**Why:** une entreprise existante pouvait conserver un pack E-commerce personnalisé ou historique que l’écran affichait et renvoyait malgré son absence de la définition intégrée, provoquant le refus serveur lors de la sauvegarde d’un autre réglage.

**How to apply:** construire la liste affichée depuis les overrides et modules personnalisés publiés, préférer la configuration d’accès serveur au cache ancien de l’entreprise, et supprimer les IDs de packs/fonctionnalités qui ne sont plus présents avant toute mutation.

Les dépendances du module Stock doivent utiliser les IDs opérationnels (`products`, `entries`, `exits`, etc.), jamais les anciens slugs de libellés.

**Why:** les libellés affichés (« Articles », « Entrées et sorties ») ne correspondent pas aux IDs réellement utilisés par les packs et le moteur de permissions ; la validation du catalogue bloquait toute publication même sans modification Stock.

**How to apply:** conserver une table canonique des dépendances Stock, la réutiliser dans la définition du module et remplacer cette forme dans les overrides historiques au moment de la lecture et de la publication.

Les secteurs doivent recalculer leurs fonctionnalités à partir des packs sélectionnés avant validation ; les sélections historiques peuvent contenir des fonctionnalités retirées d’un pack.

**Why:** un changement de packs laisse parfois `moduleFeatures` dans l’ancien état et bloque alors la publication avec une fonctionnalité « hors des packs choisis ».

**How to apply:** lors de la création du snapshot catalogue, intersecter `moduleFeatures` avec l’union des fonctionnalités des packs sélectionnés, puis publier ce snapshot nettoyé.

Les sélections de fonctionnalités d’une entreprise doivent être intersectées avec les packs du module avant toute sauvegarde d’accès.

**Why:** les entreprises historiques peuvent conserver des fonctionnalités d’un ancien pack ; l’API refuse alors correctement la combinaison, mais l’écran d’administration ne doit pas continuer à l’envoyer.

**How to apply:** normaliser les sélections au chargement et juste avant `PATCH` des accès module, puis conserver l’état local normalisé après succès.