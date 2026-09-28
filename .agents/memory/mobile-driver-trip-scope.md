---
name: Parcours de courses chauffeur mobile
description: Limites d’authentification, de confidentialité et de GPS pour les actions de course dans l’application native.
---

Les actions de course mobiles sont liées à la session chauffeur : l’entreprise et le chauffeur proviennent du jeton, jamais de champs fournis par l’application. Les droits détaillés Transport de l’employé sont vérifiés côté serveur. Un GPS récent est requis pour accepter, démarrer et terminer une course ainsi que pour devenir disponible; la pause reste possible pour nettoyer une session. Le code de prise en charge n’est ni requis ni renvoyé dans l’application mobile, sans changer le parcours desktop.

**Why:** La position récente permet de vérifier la disponibilité réelle du chauffeur sans laisser l’interface mobile contourner les droits. Le code de prise en charge reste un secret opérationnel pour le parcours desktop, pas une étape à demander au chauffeur dans l’application.

**How to apply:** Pour étendre les courses mobiles, garder l’identité liée au jeton, vérifier les capacités en base pour chaque requête, exiger une position récente aux transitions sensibles et ne pas changer les routes employé classiques.