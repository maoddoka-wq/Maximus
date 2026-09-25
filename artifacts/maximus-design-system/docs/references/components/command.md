# Command
- Slug : `command`
- État : `implemented`
- Lot : 07 — menus and selectors
- Export source : `Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator`
- Chemin source : `artifacts/maximus/src/components/ui/command.tsx`
- Dépendances : cmdk; internal Dialog
- Usage direct : aucun import direct de l’application
- Licence/provenance : code de l’application MAXIMUS du même workspace; aucune bibliothèque externe copiée comme source.
## Références
Les compteurs d’usage représentent les fichiers consommateurs uniques, pas les occurrences JSX.
Appels représentatifs : Depends on Dialog.
## Contrat de build
Référence metadata-first. Avant ce lot, relire l’implémentation complète, ses styles, ses stories/tests et ses consommateurs depuis le chemin source ci-dessus; compléter cette référence avec les variantes, états et détails observés.
Ne pas substituer une implémentation de scaffold à la source. Garder l’API et le comportement; seules les adaptations d’imports, de types privés et d’intégration au runtime du package sont permises.
Note source : Depends on Dialog