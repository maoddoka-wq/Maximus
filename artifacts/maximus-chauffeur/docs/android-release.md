# Publier une version Android

Le workflow `.github/workflows/chauffeur-android-release.yml` génère un APK signé quand un tag `chauffeur-vMAJOR.MINOR.PATCH` est poussé. L’APK est publié sous le nom `maximus-chauffeur.apk`; l’application le récupère ensuite par l’API MAXIMUS, sans exposer le dépôt GitHub aux chauffeurs.

## Secrets GitHub Actions requis

Configurer ces secrets dans le dépôt GitHub avant de créer le premier tag :

- `ANDROID_KEYSTORE_BASE64` : keystore Android de publication encodé en Base64.
- `ANDROID_KEY_ALIAS` : alias de la clé du keystore.
- `ANDROID_KEYSTORE_PASSWORD` : mot de passe du keystore.
- `ANDROID_KEY_PASSWORD` : mot de passe de la clé.

Conserver le même keystore pour toutes les versions. Le remplacer empêche Android d’installer une mise à jour par-dessus l’application existante.

## Accès de l’API aux APK privés

Le service Laravel utilise `MAXIMUS_GITHUB_READ_TOKEN` pour lire les releases du dépôt configuré par `MAXIMUS_GITHUB_RELEASE_REPOSITORY` (par défaut `maoddoka-wq/Maximus`). Ajouter un jeton de lecture du dépôt dans l’environnement Render du service API. Ne pas placer ce jeton dans l’application mobile.

Une fois les secrets configurés, créer puis pousser un tag, par exemple `chauffeur-v1.0.0`. GitHub Actions construit et publie l’APK; Render peut ensuite le servir aux chauffeurs authentifiés.