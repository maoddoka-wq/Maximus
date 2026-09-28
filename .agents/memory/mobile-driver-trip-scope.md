---
name: Parcours de courses chauffeur mobile
description: Limites d’authentification, de confidentialité et de GPS pour les actions de course dans l’application native.
---

Les actions de course mobiles sont autorisées par la session chauffeur dédiée : l’entreprise et le chauffeur proviennent du jeton, et non de champs fournis par l’application. Ce parcours peut accepter, démarrer et terminer une course sans GPS; il ne doit pas modifier les exigences GPS des routes de statut employé sur desktop. Le code de prise en charge reste côté serveur et n’est vérifié qu’au démarrage.

**Why:** Le parcours natif doit rester sans permission GPS, tandis que les parcours desktop conservent leurs contrôles GPS existants. Le code de prise en charge est un secret opérationnel à ne pas divulguer au chauffeur.

**How to apply:** Pour étendre les courses mobiles, garder l’identité liée à la session chauffeur, ne jamais renvoyer le code de prise en charge, et ne pas réutiliser l’exception GPS sur les routes employé classiques.