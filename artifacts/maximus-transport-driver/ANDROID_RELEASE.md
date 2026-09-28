# Publication Android automatique

MAXIMUS Chauffeur est une seule application partagée par toutes les entreprises. Le code de connexion entreprise sélectionne l’espace; il n’existe pas de build distinct par société.

## Générer et publier une version

Le workflow GitHub Actions `MAXIMUS Chauffeur Android APK` se lance avec un tag `chauffeur-vMAJOR.MINOR.PATCH` ou depuis l’onglet Actions en donnant une version. Il génère l’APK natif signé, crée une release versionnée et remplace l’APK de la release stable `android-latest`.

Le QR affiché dans Transport lit cette release stable. Son APK est public parce que le dépôt GitHub est public; ne placez aucun secret ou identifiant chauffeur dans le lien.

## Préparer la signature

Avant la première publication, ajouter ces secrets dans les paramètres GitHub du dépôt, sous **Secrets and variables → Actions** :

- `ANDROID_KEYSTORE_BASE64` : keystore Android encodé en Base64
- `ANDROID_KEY_ALIAS` : alias de la clé de publication
- `ANDROID_KEY_PASSWORD` : mot de passe de la clé
- `ANDROID_STORE_PASSWORD` : mot de passe du keystore

Créer et sauvegarder le keystore hors du dépôt. Ne jamais le committer ni envoyer ses mots de passe dans un message. La même clé doit servir à toutes les versions pour que les téléphones puissent installer les mises à jour sans désinstaller l’application.

Le build Android cible l’API MAXIMUS sur Render (`maximus-erp.onrender.com`). La génération échoue explicitement si les secrets de signature ne sont pas configurés.