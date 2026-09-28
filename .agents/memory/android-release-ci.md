---
name: Build Android Expo en CI
description: Dépendances explicites des plugins Expo et configuration fiable du SDK Android sur un runner propre.
---

Pour un build Android Expo sous pnpm, chaque package importé par un config plugin doit être une dépendance directe de l’application. Une résolution locale grâce au hoisting ou à une dépendance transitive ne garantit pas qu’un checkout CI propre trouvera ce package. Pour `android-actions/setup-android`, éviter la liste par défaut qui inclut l’ancien paquet SDK `tools`; déclarer `platform-tools` et laisser Gradle résoudre les composants de build nécessaires.

**Why:** Un runner propre a échoué sur le paquet SDK `tools` indisponible, puis sur un config plugin qui importait un package présent indirectement dans le workspace local, mais absent des dépendances directes de l’application.

**How to apply:** Avant une publication Android, vérifier les dépendances importées par les plugins depuis le dossier de l’application, installer avec le lockfile gelé, générer le projet natif et valider `assembleRelease` en CI.