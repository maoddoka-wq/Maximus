# Tabs
- Slug : `tabs`
- État : `implemented`
- Lot : 08 — selection controls
- Export source : `Tabs, TabsList, TabsTrigger, TabsContent`
- Chemin source : `artifacts/maximus/src/components/ui/tabs.tsx`
- Dépendances : @radix-ui/react-tabs; cn; distinct from WorkspaceTabs
- Usage direct : aucun import direct de l’application
- Licence/provenance : code de l’application MAXIMUS du même workspace; aucune bibliothèque externe copiée comme source.
## Références
Les compteurs d’usage représentent les fichiers consommateurs uniques, pas les occurrences JSX.
Appels représentatifs : App uses WorkspaceTabs instead.
## Contrat de build
Référence metadata-first. Avant ce lot, relire l’implémentation complète, ses styles, ses stories/tests et ses consommateurs depuis le chemin source ci-dessus; compléter cette référence avec les variantes, états et détails observés.
Ne pas substituer une implémentation de scaffold à la source. Garder l’API et le comportement; seules les adaptations d’imports, de types privés et d’intégration au runtime du package sont permises.
Implémentation : onglets Radix distincts de WorkspaceTabs, avec liste, triggers et panneaux; story `tabs`.