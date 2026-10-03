# Maintenir MAXIMUS sans dépendre d’un agent

## Les premières commandes

Depuis la racine du dépôt :

```sh
pnpm run audit:inventory
pnpm run audit:licenses
pnpm run typecheck
pnpm test
pnpm run test:legacy
pnpm run verify:local
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/maximus build
```

- `audit:inventory` compte les fichiers suivis et indique les sources les plus
  volumineuses. Il ne lit ni `.env`, ni secrets, ni données métier.
- `typecheck` vérifie tous les packages déclarés dans le workspace.
- `audit:licenses` régénère l’inventaire des licences JavaScript dans `reports/`
  sans recopier les noms d’auteurs ou les chemins de la machine.
- `test` exécute Laravel, les tests ERP et les tests Chauffeur.
- `test:php` impose SQLite en mémoire **dans le processus de test seulement**.
  Il ne vide pas PostgreSQL. Pour un test ciblé :
  `pnpm run test:php --filter=AppStateAuditSecurityTest`.
- `test:legacy` couvre Express. Ses tests d’intégration sont ignorés sans
  `API_TEST_DATABASE_URL`. Cette variable doit viser une base de test isolée,
  jamais le développement actif ou la production. La CI fournit cette base.
- `verify:local` assemble typage, tests locaux et contrôle du diff.
- Le build nécessite `PORT` et `BASE_PATH`, même sans démarrer le serveur.

La CI exécute aussi les tests Laravel et les audits de dépendances. Un audit peut
rester rouge lorsque l’éditeur d’une dépendance n’a pas encore publié de correctif :
ne pas masquer une alerte pour obtenir un résultat vert.

## Quel code modifier ?

| Besoin | Point d’entrée |
| --- | --- |
| Navigation et écrans ERP | `artifacts/maximus/src/` |
| API métier, permissions, stockage | `artifacts/api-server/laravel/` |
| Application chauffeur | `artifacts/maximus-chauffeur/` |
| Tokens et composants visuels | Les trois design systems dans `artifacts/` |
| Contrats et clients générés | `lib/api-spec`, `lib/api-client-react`, `lib/api-zod` |
| Installation et exploitation | `scripts/`, `render-entrypoint.sh` |
| Ancienne API pour parité/repli | `artifacts/api-server/src/` et `lib/db/` |

Laravel/PostgreSQL est le runtime actif. Express/Drizzle reste un périmètre
distinct : ne pas le supprimer avant preuve de parité.

`artifacts/maximus-windows-sync-fix/` est une archive extraite contenant des
copies récursives du dépôt, pas une nouvelle application active. Elle reste dans
l’historique en attendant une décision de conservation. Elle est exclue des
nouveaux paquets d’installation et du contexte de build Docker. `.gitignore`
n’efface pas les fichiers déjà suivis.

## Une modification = une responsabilité

1. Identifier l’écran, la route et la permission concernés.
2. Lire les tests existants et ajouter une régression avant de changer le contrat.
3. Isoler les règles métier dans un service ou une fonction pure. Garder le
   contrôleur responsable de l’entrée HTTP, de l’authentification et de la réponse.
4. Garder les composants d’écran indépendants et les helpers non visuels dans
   `src/lib/`. Ne pas créer d’import circulaire depuis `App.tsx`.
5. Réutiliser les tokens/composants du design system ; ne pas dupliquer le thème.
6. Vérifier les tests concernés, puis la suite complète pour une règle transversale.
7. Relire `git diff --check` et redémarrer uniquement le service concerné.

Le fichier `App.tsx` reste trop volumineux : son découpage doit se faire écran
par écran, avec des props explicites et des tests de navigation. Une réécriture
globale pendant une correction de sécurité empêcherait d’identifier les régressions.

## État partagé : règles à ne pas contourner

- L’entreprise vient du compte authentifié, jamais du `companyId` envoyé.
- Les collections métier envoyées au serveur sont des listes de records avec
  des identifiants simples. Aucune fusion récursive d’une carte client dans l’état global.
- Les identifiants d’une autre entreprise ne sont jamais réattribuables.
- Une entreprise peut renvoyer un catalogue identique, pas le modifier.
- Omettre un record ne veut pas dire le supprimer : les suppressions sont explicites.
- Une permission d’écriture n’autorise pas une autre fonctionnalité.
- Les permissions de lecture doivent aussi être vérifiées par l’API, pas seulement
  par le menu. La projection métier du bootstrap réutilise les permissions existantes.
- Les plans internes MAXI et le brouillon de catalogue ne vont pas aux comptes entreprise.
- Une confirmation MAXI s’applique à une étape précise. Les anciens endpoints
  d’action directe restent à harmoniser avec le contrat de confirmation des plans.

La nouvelle validation pure est dans `app/Support/CompanyStateBoundary.php`.
Les régressions HTTP sont dans `tests/Feature/AppStateAuditSecurityTest.php`.
Le découpage par secteur et par dossier employé doit encore être audité collection
par collection : le filtrage par permission ne suffit pas à prouver ce périmètre.

## Conventions et dépendances

`.editorconfig` fixe UTF-8, LF, deux espaces pour JavaScript/TypeScript et quatre
pour PHP. Pour les nouveaux petits fichiers PHP :

```sh
cd artifacts/api-server/laravel
vendor/bin/pint --test app/Support/CompanyStateBoundary.php \
  tests/Feature/AppStateAuditSecurityTest.php tests/Concerns/CreatesPublicStoreAccess.php
composer audit --locked
```

Ne pas reformater tout un contrôleur historique dans un correctif ciblé.
Installer JavaScript avec pnpm et conserver le lockfile. Ne pas éditer les fichiers
générés de codegen ou les tokens générés : modifier leur source puis régénérer.
Les fixtures de boutique doivent créer **la boutique et son autorisation publique** :
le trait `Tests\Concerns\CreatesPublicStoreAccess` évite de désactiver les garde-fous
pour faire passer un test.

## Propriété et licences : ce qui doit être vérifié

Les manifests racine et Laravel déclarent MIT, mais le dépôt ne contient pas de
licence racine permettant d’identifier le titulaire et les conditions complètes.
Ne pas inventer un titulaire, ajouter une licence restrictive ou retirer MIT sans
décision du propriétaire.

La déclaration d’une licence n’est pas une preuve de propriété :

- conserver les contrats de cession des développeurs et prestataires ;
- vérifier les conditions des outils et modèles ayant produit du code ;
- conserver les licences et attributions des bibliothèques, polices et images ;
- vérifier les ressources téléchargées ou importées, dont la provenance n’est
  pas démontrée par le dépôt ;
- compléter les cinq dépendances que l’inventaire pnpm classe « Unknown ».

Les logiciels tiers restent la propriété de leurs auteurs. Les licences
permissives, les licences doubles et MPL/OFL ont des obligations différentes.
L’inventaire technique ne constitue pas une certification juridique.

## Ce qu’un nettoyage ne doit pas faire

Pas de suppression d’archive historique, de migration de production, de purge de
données, de changement de fournisseur ou de push GitHub implicite. Les nettoyages
importants doivent garder une possibilité de retour et une validation explicite.