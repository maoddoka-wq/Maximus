---
name: Routage domaine boutique
description: Les domaines personnalisés doivent ouvrir la vitrine sans passer par l’authentification MAXIMUS.
---

Résoudre côté serveur si un hôte est central, ERP dédié, boutique autorisée ou inconnu. Seul un domaine boutique actif peut ouvrir la vitrine à la racine ; un nom inconnu ne doit jamais être présumé être une boutique.

**Why:** La détection par suffixe de fournisseur confondait les domaines ERP des entreprises avec des boutiques. Un accueil central par défaut pendant le chargement exposait aussi le mauvais parcours.

**How to apply:** Attendre le contexte serveur avant le rendu, conserver un état de panne explicite avec nouvelle tentative et préserver l’hôte d’origine dans les proxies. Les adresses privées sont propres à chaque installation ; seuls les noms publics doivent être réservés globalement.