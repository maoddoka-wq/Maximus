# Metric
- Slug : `metric-card`
- État : `implemented`
- Story : `src/preview/demos/metric-card.tsx` (Overview et rubrique dédiée).
- Vérification : typecheck et build Vite réussis; captures clair/sombre/mobile et interactions navigateur contrôlées.
- Lot : 01 — pilote
- Export source : `Metric`
- Chemin source : `artifacts/maximus/src/components/app-ui.tsx:128-179`
- Dépendances : LucideIcon; source theme classes .card-surface/.fade-up/.mono
- Usage direct : 1 fichier(s) — src/App.tsx
- Licence/provenance : code de l’application MAXIMUS du même workspace; aucune bibliothèque externe copiée comme source.
## Références
Les compteurs d’usage représentent les fichiers consommateurs uniques, pas les occurrences JSX.
Appels représentatifs : App.tsx:2789, 2796.
## Contrat du pilote
API : label, value, suffixe, détail, icône Lucide, accent et warning.
Affiche LIVE seulement en mode accent; warning colore le détail en destructive et l’icône en accent. Le runtime reprend `.card-surface`, `.fade-up` et `.mono` de `artifacts/maximus/src/index.css:185,206-207,280-284,313-317`.
L’alias privé `Icon` devient `LucideIcon`; aucun contexte StoreData n’est requis.