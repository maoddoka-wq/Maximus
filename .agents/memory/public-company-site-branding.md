---
name: Identité du site public de l’entreprise
description: Règle d’isolation entre la marque commune du site d’entreprise et les permissions de ses rubriques publiques.
---

Le nom, le slug public, la marque, le logo, les images d’accueil et le domaine appartiennent au site public de l’entreprise. `/site/{slug}` ouvre directement l’accueil de marque de l’entreprise, sans écran de choix et sans dépendre d’E-commerce; les modules autorisés restent accessibles par la navigation interne. `/shop/{slug}` reste une compatibilité technique. E-commerce ne garde que son statut, sa devise et les pièces jointes aux commandes. Ses données métier restent soumises à son activation; Transport et Immobilier gardent leurs propres accès.

**Why:** L’utilisateur a précisé que le site entier doit s’ouvrir directement quel que soit le module autorisé, sans choix de page ni dépendance à E-commerce.

**How to apply:** Garder `/site/{slug}` comme accueil d’entreprise même sans E-commerce; afficher uniquement les modules autorisés dans la navigation interne, sans rediriger l’accueil vers E-commerce ni présenter un écran de sélection.