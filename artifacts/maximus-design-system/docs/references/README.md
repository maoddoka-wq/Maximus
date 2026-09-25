# Références MAXIMUS

Source visuelle et composants : `artifacts/maximus/` dans le même workspace. Les composants sont issus du code MAXIMUS; aucune bibliothèque externe n’a été copiée comme source.

## Logo retenu

- `logos/maximus-mark.svg` : logo vectoriel principal issu de `artifacts/maximus/public/maximus-mark.svg`; SVG statique avec dégradé interne, sans script, gestionnaire d’événement ni référence externe.
- `logos/maximus-mark.png` : rendu raster 512 × 512 utilisé dans l’aperçu.

## Contrat de thème

Les rôles de `tokens.json` reprennent les thèmes globaux clair/sombre MAXIMUS. Ils sont les valeurs par défaut du package, pas un remplacement du thème par entreprise.

`artifacts/maximus/src/lib/company-theme.ts` applique les couleurs d’entreprise comme variables CSS inline sur `document.documentElement`. Dans l’application consommatrice, importer le CSS du package avant le CSS local MAXIMUS, puis appeler `applyCompanyTheme(...)` après le chargement des feuilles de style. Les variables runtime en ligne restent prioritaires; chaque entreprise conserve ainsi sa couleur principale, son accent et sa sidebar.

Les couleurs de graphiques sont des compléments dérivés pour les cinq rôles requis par DTCG; le CSS source n’en définit pas.
