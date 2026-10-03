# Audit du code MAXIMUS — 3 octobre 2026

## Conclusion

L’audit global et un premier nettoyage sécurisé sont réalisés. Ils ne constituent
ni une certification de sécurité, ni une preuve juridique de propriété, ni une
refonte complète de l’application.

Le typage de tous les packages déclarés passe. Le build ERP passe. La suite
Laravel passe avec **359 tests et 2 581 assertions** ; les suites ERP et Chauffeur
passent avec **263 et 49 tests**. Express a **6 tests réussis et 6 intégrations
ignorées**, faute de base PostgreSQL de test explicitement configurée dans ce
passage local. La CI fournit une base isolée pour ces intégrations.

## Périmètre et méthode

- Inventaire du dépôt : 7 413 fichiers suivis au début de l’audit.
- 5 440 fichiers appartiennent à une archive Windows extraite, imbriquée jusqu’à
  dix niveaux. Onze lockfiles Composer sont présents, dont un seul pour Laravel actif.
- Revue ciblée de l’architecture, de l’état partagé, des permissions et de MAXI.
- Exécution des suites existantes, ajout de huit régressions HTTP, typage et build.
- Trois scans : dépendances, analyse statique et flux de données.
- Inventaires des licences pnpm et du lockfile Composer actif.

La revue humaine est ciblée, pas une lecture de chaque ligne des 7 413 fichiers.
Les routes publiques ont une couverture partielle. Les tests Laravel locaux
utilisent SQLite en mémoire ; ils ne prouvent pas la parité PostgreSQL complète,
ni les parcours navigateur, ni le fonctionnement de l’APK sur un téléphone réel.

## Corrections livrées

| Problème constaté | Correction et preuve |
| --- | --- |
| Collection associative fusionnée récursivement avant filtrage entreprise | Validation de la forme et suppression de cette fusion ; requête rejetée en 422 |
| Modification du catalogue partagé par un administrateur entreprise | Catalogue identique accepté ; modification globale refusée en 403 |
| Réattribution d’un identifiant détenu par une autre entreprise | Vérification du propriétaire avant fusion ; refus en 403 |
| Plans internes MAXI et catalogue brouillon présents dans les réponses entreprise | Retrait de ces clés pour les comptes non-MAXIMUS |
| Paie/documents et autres collections métier lus sans droit de fonctionnalité | Projection du bootstrap réutilisant l’autorisation de lecture existante |
| Identifiants composés pouvant provoquer une erreur serveur | Validation explicite des identifiants de record et d’entreprise |
| Tests ne représentant plus l’autorisation publique et les contrats actuels | Trait commun de fixture publique, attentes de domaine et galerie corrigées |
| Header Bearer d’installation conservé pendant une action administrateur | Nettoyage du header dans le test, sans modifier l’authentification de production |
| Absence de tests Laravel dans la CI | Étape Laravel ajoutée |
| Archives de source réintroduites dans les paquets d’installation | Exclusion des copies Windows, ZIP et APK du paquet source et du contexte Docker |

La validation est isolée dans `CompanyStateBoundary`, indépendante de la base et
testable via les routes. Les index de records sont construits une fois, plutôt
que relus pour chaque record. Les tests confirment aussi qu’une sauvegarde légitime
préserve les données de l’autre entreprise et les plans privés MAXI.

## Maintenabilité : réalisé et restant

Réalisé :

- conventions d’édition partagées via `.editorconfig` ;
- commandes racine pour inventaire, licences, tests et vérification locale ;
- lanceur Laravel imposant une base SQLite en mémoire dans le processus de test ;
- validation de frontière multi-entreprise dans une responsabilité séparée ;
- fixture d’autorisation publique réutilisable ;
- guide de reprise humain lié depuis `README.md`.

À terminer :

1. **Découper `App.tsx`**, encore environ 9 572 lignes, écran par écran avec props
   explicites, sans changer les routes ou les tokens du design system.
2. Découper progressivement les contrôleurs E-commerce et Transport, chacun
   au-delà de 2 600 lignes. Éviter une extraction en même temps qu’un changement métier.
3. Compléter la projection par rôle, secteur et dossier : les collections RH,
   les données administratives et le périmètre des records déjà autorisés doivent
   encore être vérifiés. Le filtrage par module n’est pas une preuve de confinement par unité.
4. Harmoniser les anciens endpoints d’action directe MAXI avec les confirmations
   des plans : aperçu lié, expiration, version et idempotence.
5. Archiver séparément puis retirer les copies Windows suivies, après accord
   explicite. Elles sont **préservées**, pas effacées par `.gitignore`.

## Sécurité des dépendances

Le scan global initial signale **12 alertes hautes et 10 modérées**. Vingt
occurrences concernent CommonMark dans dix copies historiques. Le Laravel actif
utilise déjà CommonMark **2.10.3** et son audit Composer ne signale pas d’avis.
La tentative de mise à jour compatible n’a rien changé : il était déjà corrigé.

L’audit pnpm actif confirme **deux alertes hautes**, sans version corrigée publiée
sur le registre consulté : `braces` 3.0.3 et `node-forge` 1.4.0. Ils sont notamment
amenés par les outils Expo/Metro et d’autres outils de construction. Leur présence
ne prouve pas un accès exploitable depuis une route publique ; elle reste un risque
à surveiller, en particulier pour la chaîne de construction et de signature.
Aucune rétrogradation, exception d’audit ou modification du code fournisseur
n’a été appliquée pour masquer ces alertes.

Le scan statique est **incomplet** malgré zéro résultat retourné. Le scan de flux
de données ne retourne aucun résultat. Ni l’un ni l’autre ne garantit l’absence
de vulnérabilité, de secret historique ou de fuite de données.

## Propriété et licences

**La propriété juridique exclusive n’est pas démontrable à partir du dépôt seul.**

- Les manifests racine et Laravel déclarent MIT ; aucun fichier de licence racine
  n’identifie clairement le titulaire et les conditions complètes.
- L’inventaire pnpm contient 869 entrées de package/licence, dont cinq « Unknown » :
  `@replit/connectors-sdk`, `@replit/vite-plugin-cartographer`,
  `@replit/vite-plugin-dev-banner`, `@replit/vite-plugin-runtime-error-modal`,
  `create-launch`. « Unknown » signifie métadonnées absentes dans cet outil,
  pas absence certaine de droit d’utilisation.
- Les 115 entrées du lockfile Composer actif déclarent une licence : 81 MIT,
  31 BSD-3-Clause, deux alternatives BSD/GPL et une Apache-2.0.
- Des licences MPL, OFL, CC-BY et des licences doubles demandent des obligations
  adaptées aux fichiers redistribués. Une licence double GPL/BSD n’impose pas
  automatiquement de placer toute l’application sous GPL.
- Les droits des images, polices, ressources importées et contributions doivent
  être rapprochés des licences et des contrats de cession.
- L’historique des commits ne remplace pas les contrats de propriété. Les
  conditions des outils de génération doivent aussi être vérifiées.

Aucun titulaire n’a été inventé et aucune licence existante n’a été remplacée.
Une validation juridique et une décision du propriétaire restent nécessaires
avant de déclarer le projet exclusif ou de changer sa licence.

## Reprendre le travail

Après redémarrage, l’API de développement répond **HTTP 200** sur sa sonde de
santé et la page de connexion ERP s’affiche sans erreur navigateur.
Les logs Expo montrent Metro actif, mais le débogueur natif ne démarre pas,
faute de `libglib-2.0.so.0` dans l’environnement. Ce problème d’outillage reste
à corriger ; aucun test sur appareil Android réel n’a été réalisé dans cet audit.

Voir `docs/guides/human-maintenance.md`.

```sh
pnpm run audit:inventory
pnpm run audit:licenses
pnpm run verify:local
pnpm run test:legacy
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/maximus build
```

Les preuves structurées sont dans `reports/code-audit-scanners.json`,
`reports/code-audit-licenses.json` et `reports/code-audit-inventory.json`.

**Aucun push GitHub, déploiement Render, changement de licence, purge de données
ou migration de production n’a été réalisé.**