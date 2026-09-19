# Company catalogue / registration audit

## Evidence and limits

- Read-only development `GET /api/registration-catalog` captured by the coordinating agent at `/tmp/maximus-registration-audit.json`: empty overrides/custom modules, null sector presets. No production catalogue, historical customer records, or production database was examined.
- Historical/custom catalogue failures below are explicitly constructed regression fixtures, not claims about a particular production record.
- Read the registration-catalog-boundary, catalogue-override-normalization, canonical-feature-identities and catalog-workflow memories. Existing override normalization already merges published overrides in Laravel; this audit does **not** attribute the remaining failures to overrides simply being ignored by the backend.

## Trace and remaining causes

1. Public registration fetches the public catalogue, not workspace state. Its UI uses module-feature options and emits requested module IDs, pack IDs, feature IDs and per-feature permissions. The creation service calls `ModuleCatalog::normalizeSelection`, stores canonical selections on the pending company, and approval copies them to company module access.
2. Editing uses module access bootstrap and PATCH `/api/modules/{id}/access`, with the same normalizer. The editor calculated configured modules but rendered built-in `modules`; consequently published pack overrides/custom modules could be absent or inconsistent with the selection being saved. It also silently removed stale pack IDs on load.
3. The old Laravel allowlist was the union of **pack references** and `Str::slug(feature label)`. This confused identity with membership: arbitrary stale references became valid features; legitimate features absent from every pack (e.g. Commerce `settings`/`team`) were rejected. `Str::slug` removes accents while frontend permission slugs retain them. A published custom feature `Échéances`, pack reference `echeances`, and frontend selection `échéances` reproduced the reported absent-feature rejection.
4. Frontend pack membership compared canonical feature selections against raw pack references, dropping recognized aliases. Pack errors were not actionable in the form.
5. The signup feature section was hidden precisely when a module had packs but none was selected. Initial/manual module selections defaulted to all feature options, despite the hidden section.
6. Empty feature selections with a selected pack were expanded to the entire pack. An endpoint regression additionally proved that passing `featureScope` inside validated configuration was insufficient: the edit boundary needed to derive explicit scope from the actual `featureIds` field.

## Fix and semantics

- Independent canonical feature identities now validate pack references and submitted feature/permission aliases. Fixed operational modules mirror the existing frontend tab registries; other modules derive IDs from published feature labels. Packs cannot mint identities. Unknown features and removed packs still fail with 422; removed/unpublished modules remain rejected; authorization is unchanged.
- Registration and approval preserve explicitly supplied empty selections. Module PATCH derives explicit scope server-side. Pack-only legacy/API input can still resolve a valid pack, but **packless input never means all features**.
- Public signup shows individual features below optional packs. New manual selections start empty. Selecting a pack preselects its canonical members; individual choices are restricted to those members while a pack is selected. “Choisir sans pack” clears selection for explicit rebuilding. Stale packs show an actionable error and can be removed.
- Signup explicitly excludes catalogue drafts and includes published custom modules. Company editing renders configured published modules, retains stale references for diagnosis, normalizes aliases, and provides packless selection.
- No migration/backfill of historical permissions was performed.

## Verification

Before implementation, isolated SQLite regression suite: **3 tests, 1 error + 2 failures**:

- accented custom pack rejected as absent feature;
- stale pack reference incorrectly accepted instead of throwing;
- packless Commerce `settings` registration returned 422 instead of 201.

A later endpoint regression also failed before the explicit-scope boundary fix: deselecting every feature in a valid pack still allowed `dashboard`.

After fixes:

- `APP_ENV=testing DB_CONNECTION=sqlite DB_DATABASE=:memory: DB_URL='' CACHE_STORE=array SESSION_DRIVER=array php vendor/bin/phpunit tests/Feature/CatalogSelectionRegressionTest.php tests/Feature/CompanyRequestTest.php tests/Feature/ModuleAccessTest.php tests/Feature/PublicRegistrationSettingsTest.php`: final integrated run **32 tests / 203 assertions passed**.
- Coverage includes every built-in pack, published override selection (existing integration test), accent/permission aliases, stale packs/features, packless create → approval → edit persistence, invalid edits preserving prior state, and explicitly empty access.
- Frontend focused selection/permissions/catalogue tests: **40 passed**; `pnpm typecheck` passed.
- Final integrated frontend suite: **147/147 passed**, including deletion-lock normalization and authenticated branded logout context. TypeScript check and `git diff --check` passed.
- Real browser checks on 2026-09-19, with synthetic development fixtures only: packless signup persisted exactly Commerce `dashboard` + `voir`, with zero packs; approval succeeded; the access editor saved/reloaded a valid Commerce pack with exactly its two features, then saved/reloaded packless `team` + `voir` without granting other features.
- Deletion-lock browser checks: locked delete disabled; explicit unlock persisted after reload; relock restored protection; direct authenticated DELETE returned 423 and left the synthetic company active. Branded login → reload → logout returned to the exact branded URL; generic login/logout returned to `/`.
- An initial browser pass found a real event-binding defect: a click event was passed into an optional logout destination and produced `[object Object]` in the URL. The logout button now calls a zero-argument wrapper; the targeted browser continuation verified the correction successfully.
- Temporary browser fixtures, their requests, users, sessions and access records were removed; exact final fixture counts were zero. No existing company was edited or deleted, and the published catalogue was not changed for these checks.

No production access or pushes. PHP regression test writes were isolated in in-memory SQLite. The deletion-lock migration was applied only to development PostgreSQL, and both existing application workflows were restarted.

## Déconnexion depuis un lien entreprise

Le retour était calculé depuis les données métier de l’entreprise, qui ne constituent pas une trace fiable du lien de connexion et peuvent être rechargées ou effacées. L’ancien chemin enregistré n’était pas consommé.

Le correctif conserve le chemin canonique après une connexion entreprise réussie, associé à l’identité de l’entreprise authentifiée. La restauration de session réutilise ce contexte uniquement pour la même entreprise ; une connexion générique l’efface. Les installations dédiées restent sur leur racine locale. Les tests couvrent actualisation, contexte expiré ou malformé, autre entreprise et connexion générique.

## Protection contre la suppression accidentelle

La suppression passait par `CompanyController::destroy()` sans verrou indépendant. Le verrou est désormais actif par défaut et modifiable uniquement par MAXIMUS. Le serveur le contrôle dans la transaction de suppression ; une requête directe sur une entreprise verrouillée renvoie 423. Le catalogue affiche un bouton de verrouillage/déverrouillage et désactive la suppression quand le verrou est actif.

Les tests vérifient également que les anciens snapshots, l’édition du profil et l’écriture d’état partagé ne peuvent pas contourner le verrou serveur. Aucun compte existant n’a été supprimé pour ces tests.