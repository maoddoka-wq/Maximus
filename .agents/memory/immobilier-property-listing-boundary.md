---
name: Modèle de publication Immobilier
description: Le Bien est la fiche unique qui porte aussi son statut de publication.
---

Immobilier utilise une fiche Bien unique, en Brouillon ou Publié : il n’y a pas de seconde fiche Annonce à recréer. Les autorisations Annonces contrôlent la création et la diffusion de cette fiche ; les autorisations Biens protègent les données internes, notamment l’adresse et les notes privées. Garder les anciennes lignes d’annonces pour compatibilité et reprise, sans les supprimer.

**Why:** Le 6 octobre 2026, l’utilisateur a choisi explicitement le modèle d’un seul Bien avec les statuts Brouillon/Publié.

**How to apply:** Utiliser le Bien comme source de vérité dans l’administration, les autorisations, la vitrine et le lien public. Ne jamais exposer les données privées dans les vues réservées à Annonces ou dans les réponses publiques.