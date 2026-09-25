# ActionButton
- Slug : `action-button`
- État : `implemented`
- Story : `src/preview/demos/action-button.tsx` (Overview et rubrique dédiée).
- Vérification : typecheck et build Vite réussis; captures clair/sombre/mobile et interactions navigateur contrôlées.
- Lot : 01 — pilote
- Export source : `ActionButton`
- Chemin source : `artifacts/maximus/src/components/app-ui.tsx:295-347`
- Dépendances : React MouseEvent/useState; Lucide Plus/LoaderCircle; PromiseLike behavior
- Usage direct : 2 fichier(s) — src/App.tsx, src/pages/organization-shared.tsx
- Licence/provenance : code de l’application MAXIMUS du même workspace; aucune bibliothèque externe copiée comme source.
## Références
Les compteurs d’usage représentent les fichiers consommateurs uniques, pas les occurrences JSX.
Appels représentatifs : App.tsx:2763, 3560.
## Contrat du pilote
API : children requis; `onClick` facultatif; primary, testId, icône Lucide (Plus par défaut), disabled, loading et className.
Conserve le comportement asynchrone : bloque les clics pendant le chargement, rend `aria-busy`, montre LoaderCircle et libère pending après résolution ou rejet. Les erreurs restent gérées par l’appelant.
Classes source : `app-action`, `btn`; style `.btn` dans `artifacts/maximus/src/index.css:277-279`. L’alias d’icône privé devient `LucideIcon` sans changement de comportement.