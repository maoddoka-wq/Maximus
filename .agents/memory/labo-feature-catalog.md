---
name: Catalogue de fonctionnalités LABO
description: Règles de catalogue partagé, association aux modules et isolation des enregistrements LABO.
---

Le catalogue LABO est global : chaque définition de fiche existe une seule fois, et chaque module référence les fonctionnalités qui lui sont associées par identifiant. Associer une fonctionnalité à un module ne la retire pas de son module d’origine. Les enregistrements restent indépendants selon l’entreprise, le module et la fonctionnalité.

Une fonctionnalité native utilisée comme point de départ doit devenir une fiche LABO configurable avec ses propres champs et son propre workflow, pas un lien vers l’écran natif. Conserver sa provenance comme métadonnée sans partager ses enregistrements.

**Why:** Le besoin métier exige qu’une fonctionnalité puisse rester disponible dans son module d’origine et être montée dans d’autres modules sans mélanger leurs données.

**How to apply:** Toute création ou association passe par le catalogue partagé; vérifier les autorisations du module cible et tester que le même identifiant produit des listes d’enregistrements distinctes pour chaque module et entreprise.