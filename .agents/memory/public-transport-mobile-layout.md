---
name: Mise en page mobile Transport public
description: La vue Taxi publique doit garder l’en-tête, la carte et la navigation fixes pendant que seul le panneau métier défile.
---

La vue Transport publique mobile doit être composée d’un en-tête de boutique, d’une carte à hauteur maîtrisée, d’un panneau inférieur avec son propre scroll et d’une navigation fixe.

**Why:** le scroll global faisait disparaître l’en-tête, le bouton Retour et l’état GPS, créant deux compositions visuelles incohérentes selon la position de défilement.

**How to apply:** verrouiller la hauteur de la page Transport sous mobile, dimensionner la carte et le panneau dans cette hauteur, puis limiter `overflow-y-auto` au panneau inférieur.