---
name: Configuration des vitrines publiques
description: Emplacement des réglages et autorisations des pages publiques E-commerce et Transport.
---

Les réglages de vitrine publique sont regroupés dans « Organisation et accès », sous « Nom du site public », et chaque section n’apparaît que si l’entreprise est autorisée à utiliser la fonctionnalité concernée. Location et Livraisons dépendent d’E-commerce ; Transport dépend du module `transport`. Une entreprise doit pouvoir publier sa page Transport sans activer E-commerce : l’identité, l’URL et le bootstrap publics Transport ne doivent donc pas dépendre d’un enregistrement `ecommerce_stores`. Les anciennes URL Transport sous `/shop/{slug}/transport` peuvent être conservées comme compatibilité si une boutique existe.

**Why:** Certaines entreprises ont besoin d’une vitrine Transport sans boutique e-commerce. Déplacer uniquement les champs de configuration ne suffit pas si la résolution publique reste liée à une boutique.

**How to apply:** Regrouper les réglages sous le nom public partagé, filtrer les sections avec les autorisations effectives de l’entreprise et valider ces droits côté API. Pour Transport, résoudre le tenant depuis son identité publique propre, sans exiger E-commerce ; garder les parcours Location/Livraisons liés à leur capacité e-commerce.