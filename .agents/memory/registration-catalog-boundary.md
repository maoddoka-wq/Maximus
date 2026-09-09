---
name: Registration catalog boundary
description: Public company registration reads the published catalog without exposing workspace state.
---

Le formulaire public d’inscription doit charger les secteurs, modules, packs et overrides depuis une représentation publique du catalogue publié. Il ne doit jamais recevoir l’état workspace complet, les entreprises, ni `catalogDraft`.

**Why:** Les secteurs créés dans MAXIMUS sont persistés dans l’état partagé et peuvent être en brouillon. Lire uniquement les valeurs frontend rendait les nouveaux secteurs invisibles à l’inscription et exposer l’état workspace serait une fuite de données.

**How to apply:** Ajouter ou modifier une route publique dédiée au catalogue d’inscription, ne retourner que les champs de catalogue publiés, conserver les presets frontend comme secours, et ne synchroniser l’interface publique qu’à l’ouverture de `/inscription`.