---
name: Identité du site public de l’entreprise
description: Règle d’isolation entre la marque commune du site d’entreprise et les permissions de ses rubriques publiques.
---

Le nom, le slug public, la marque, le logo, les images d’accueil et le domaine appartiennent au site public de l’entreprise. `/site/{slug}` est l’adresse canonique de l’entreprise et de ses modules activés; `/shop/{slug}` reste une compatibilité technique, pas une seconde vitrine. E-commerce ne garde que son statut, sa devise et les pièces jointes aux commandes. Ses données métier restent soumises à l’activation de la rubrique E-commerce; Transport et Immobilier gardent leurs propres accès.

**Why:** L’utilisateur a précisé que le lien doit représenter toute l’entreprise et ses modules actifs, sans adresse distincte de boutique E-commerce.

**How to apply:** Persister les réglages visuels et le domaine via les API du site public; garder `/site/{slug}` canonique, et ne pas relâcher les contrôles des données métier pour simplifier leur affichage.