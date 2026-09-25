# Input
- Slug : `input`
- État : `implemented`
- Story : `src/preview/demos/input.tsx` (Overview et rubrique dédiée).
- Vérification : typecheck et build Vite réussis; captures clair/sombre/mobile et interactions navigateur contrôlées.
- Lot : 01 — pilote
- Export source : `Input`
- Chemin source : `artifacts/maximus/src/components/ui/input.tsx:1-21`
- Dépendances : React forwardRef; local cn utility
- Usage direct : 2 fichier(s) — src/components/company-installation-access.tsx, src/components/ui/sidebar.tsx
- Licence/provenance : code de l’application MAXIMUS du même workspace; aucune bibliothèque externe copiée comme source.
## Références
Les compteurs d’usage représentent les fichiers consommateurs uniques, pas les occurrences JSX.
Appels représentatifs : Source exports a forwardRef input with native input props.
## Contrat du pilote
Source complète : `artifacts/maximus/src/components/ui/input.tsx:1-21`.
`React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>`; transmet type, ref et toutes les props natives. Les classes donnent la hauteur 36 px, bordure, focus visible par ring, placeholder et état disabled; `className` peut surcharger via `cn`.
Le port conserve `forwardRef` et les props; seul l’alias `@/lib/utils` devient l’utilitaire local `cn`.