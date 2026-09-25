# Field (UI)
- Slug : `field`
- État : `implemented`
- Lot : 06 — forms and sidebar
- Export source : `Field, FieldLabel, FieldDescription, FieldError, FieldGroup, FieldLegend, FieldSeparator, FieldSet, FieldContent, FieldTitle`
- Chemin source : `artifacts/maximus/src/components/ui/field.tsx`
- Dépendances : Label; Separator
- Usage direct : aucun import direct de l’application
- Licence/provenance : code de l’application MAXIMUS du même workspace; aucune bibliothèque externe copiée comme source.
## Références
Les compteurs d’usage représentent les fichiers consommateurs uniques, pas les occurrences JSX.
Appels représentatifs : Distinct from app-ui Field; internally composes Label/Separator.
## Contrat de build
Référence metadata-first. Avant ce lot, relire l’implémentation complète, ses styles, ses stories/tests et ses consommateurs depuis le chemin source ci-dessus; compléter cette référence avec les variantes, états et détails observés.
Ne pas substituer une implémentation de scaffold à la source. Garder l’API et le comportement; seules les adaptations d’imports, de types privés et d’intégration au runtime du package sont permises.
Note source : Distinct from app-ui Field; internally composes Label/Separator