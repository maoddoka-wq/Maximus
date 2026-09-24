---
name: Installation des decks slides
description: Synchronisation pnpm d’un nouvel artefact slides dans le monorepo.
---

À la création d’un nouvel artefact slides, son manifeste de paquets peut être absent du lockfile workspace. En mode non interactif, pnpm 10 peut aussi refuser de recréer `node_modules` sans TTY. Pour synchroniser les dépendances déjà déclarées, utiliser `CI=true pnpm install --filter @workspace/<slug> --no-frozen-lockfile`.

**Why:** Le scaffold crée un nouvel importer workspace, mais le lockfile global n’est pas synchronisé au même moment.

**How to apply:** Si les scripts du deck signalent des outils manquants après le scaffold, synchroniser uniquement l’artefact avant de lancer validation et build.