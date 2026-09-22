---
name: Isolation des thèmes publics
description: Les réglages de la boutique et du module Transport public doivent rester indépendants.
---

Le thème global de la boutique publique lit uniquement les couleurs de la boutique. Le thème Transport public lit uniquement ses propres couleurs et applique ses variables dans son conteneur local.

**Why:** Les valeurs par défaut du Transport avaient été ajoutées à une fonction de thème partagée, ce qui modifiait les pages publiques sans rapport avec Transport.

**How to apply:** Lorsqu’un module public reçoit des réglages visuels propres, créer une fonction de thème dédiée et des variables CSS préfixées par le module ; ne jamais réutiliser ses valeurs par défaut dans le thème global.