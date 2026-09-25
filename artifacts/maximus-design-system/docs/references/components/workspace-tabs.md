# WorkspaceTabs
- Slug : `workspace-tabs`
- État : `implemented`
- Story : `src/preview/demos/workspace-tabs.tsx` (Overview et rubrique dédiée).
- Vérification : typecheck et build Vite réussis; captures clair/sombre/mobile et interactions navigateur contrôlées.
- Lot : 01 — pilote
- Export source : `WorkspaceTabItem (type), WorkspaceTabs`
- Chemin source : `artifacts/maximus/src/components/workspace-tabs.tsx:1-54`
- Dépendances : LucideIcon; CSS .module-tabs; controlled activeId/onChange
- Usage direct : 9 fichier(s) — commerce-module, ecommerce-module, stock-module, transport-module, presence-module, payroll-module, operational-modules, control-center, company-organization
- Licence/provenance : code de l’application MAXIMUS du même workspace; aucune bibliothèque externe copiée comme source.
## Références
Les compteurs d’usage représentent les fichiers consommateurs uniques, pas les occurrences JSX.
Appels représentatifs : commerce-module.tsx:190; ecommerce-module.tsx:404.
## Contrat du pilote
API contrôlée : `items`, `activeId`, `onChange`, `ariaLabel`, préfixe `data-testid` facultatif et classe additionnelle facultative.
Chaque élément expose identifiant, libellé et icône Lucide facultative; l’onglet actif porte `aria-current=page`. Les rubriques débordantes restent défilables horizontalement.
CSS source : `artifacts/maximus/src/index.css:220-222` (barre fine, cible minimale 40 px, contour au survol). Le port garde la structure et réécrit uniquement les imports aliasés.