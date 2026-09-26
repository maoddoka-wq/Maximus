---
name: Identité du site public de l’entreprise
description: Règle d’isolation entre la marque commune du site d’entreprise et les permissions de ses rubriques publiques.
---

Le nom, le slug public, la marque, le logo, les images d’accueil et le domaine appartiennent au site public de l’entreprise. `/site/{slug}` ouvre directement l’accueil de marque, sans écran de choix et sans dépendre d’E-commerce. L’en-tête ne propose que « Accueil »; les pages des modules autorisés gardent leurs routes dédiées sans apparaître comme choix près de l’accueil. `/shop/{slug}` reste une compatibilité technique. E-commerce ne garde que son statut, sa devise et les pièces jointes aux commandes. Ses données métier restent soumises à son activation; Transport et Immobilier gardent leurs propres accès.

**Why:** L’utilisateur a précisé que le site s’ouvre directement quel que soit le module autorisé et a signalé que les liens de modules près de « Accueil » ne sont pas prévus.

**How to apply:** Garder `/site/{slug}` comme accueil d’entreprise même sans E-commerce; ne pas ajouter de choix de modules dans l’en-tête près d’« Accueil ». Conserver les routes de module et leur contrôle d’autorisation sans forcer une page d’entrée.