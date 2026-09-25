# Field (application)
- Slug : `app-field`
- État : `implemented`
- Story : `src/preview/demos/app-field.tsx` (Overview et rubrique dédiée).
- Vérification : typecheck et build Vite réussis; captures clair/sombre/mobile et interactions navigateur contrôlées.
- Lot : 01 — pilote
- Export source : `Field`
- Chemin source : `artifacts/maximus/src/components/app-ui.tsx:64-126`
- Dépendances : React useState; Eye/EyeOff; HTMLInputTypeAttribute; app CSS variables
- Usage direct : 2 fichier(s) — src/App.tsx, src/pages/organization-shared.tsx
- Licence/provenance : code de l’application MAXIMUS du même workspace; aucune bibliothèque externe copiée comme source.
## Références
Les compteurs d’usage représentent les fichiers consommateurs uniques, pas les occurrences JSX.
Appels représentatifs : App.tsx:1538; organization-shared.tsx imports and renders Field.
## Contrat du pilote
API contrôlée : label React, value texte/nombre, `onChange(value)`, placeholder, type HTML, identifiant de test et aide facultative.
L’aide par défaut est générée depuis le libellé; les mots de passe ont un contrôle afficher/masquer accessible. L’autocomplétion dépend des identifiants de connexion; préserver `email`, `current-password` et `new-password`.
Le composant utilise les rôles CSS input/card/primary/ring/muted-foreground/foreground. Le port remplace uniquement les types privés par les types React et Lucide publics.