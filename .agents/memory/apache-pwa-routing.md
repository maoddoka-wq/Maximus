---
name: Routage Apache des PWA
description: Les routes SPA terminées par une barre oblique doivent rester sur le domaine public en production Render.
---

Les routes PWA profondes doivent être servies par le fallback React sans redirection automatique de la barre finale vers le port interne Apache.

**Why:** Une redirection Apache vers le port interne `10000` produit une URL HTTP inaccessible depuis un téléphone et affiche une erreur Forbidden au lancement de la PWA.

**How to apply:** Dans la configuration Apache/Laravel de production, conserver les routes inconnues non-fichiers sur `index.html` et ne pas appliquer de règle globale de suppression de la barre finale aux routes SPA.