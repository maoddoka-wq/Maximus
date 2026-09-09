---
name: Module development
description: Rules for making future MAXIMUS modules reusable by any authorized company and easy for a human developer to extend.
---

A MAXIMUS module is designed and implemented independently of any company, as a complete reusable business tool. Authorized companies are consumers of the catalog module; they receive access and configuration separately. KORA is only demo data and must never be a module-specific fallback or hardcoded tenant.

**Why:** Treating a module as belonging to one company reverses the product model, encourages client-specific copies, and makes the catalog impossible to reuse consistently.

**How to apply:** Give each module a stable id and its own business contract, keep its Laravel routes/controllers/services/tests and frontend API/pages grouped, separate the global module definition from company access/configuration, require server-side company context for tenant data, and ship the module with a human-readable guide and isolation tests.

For modules with several screens, keep one canonical feature definition shared by the catalog, registration choices, navigation, and the module page. Do not maintain a shorter hand-written feature list beside the runtime tabs.

**Why:** A shortened catalog makes companies choose incomplete capabilities during onboarding and causes permissions or navigation to hide real module functions.

**How to apply:** Add every user-facing capability to the module feature manifest first, derive the module catalog and navigation from it, and add a regression test that compares the manifest with the selectable feature options.

Each MAXIMUS module is a reusable business application built from named business packs. Packs are constitutive application offerings, not optional metadata added after the module is created; a module should be publishable only once its pack composition is valid. Sector presets select those existing module packs directly. A selected pack is a starting role template, not a permanent lock: the company can add or remove features and create independent roles.

**Why:** The product is understood as application → business packs → features and rights. Treating a pack as optional reverses that model and lets an application exist without a usable business offering. Pack names and permissions are defined once in the module catalog, while real companies need to adapt a template to their organization without duplicating the catalog or being forced into one role.

**How to apply:** Keep creation and publication explicit as module application → one or more module packs → pack features and rights → sector/company selection → editable company roles. Show packs only after their module is selected, persist the selected composition with the signup request or unit, and let administrators review the resulting permissions. A draft module may be incomplete, but a usable/published module needs a valid pack composition.

Legacy packs without an explicit feature permission map are interpreted as view-only when they are edited, tested, or copied into an onboarding request.

**Why:** The new pack contract must not silently grant create or modify rights to existing data that only recorded a feature list.

**How to apply:** Treat a missing or empty feature permission as `voir` for included features, and persist the explicit permission map on the next save or signup request.

Feature visibility must use the explicit feature selection, while dependencies remain an internal effective-permission concern.

**Why:** A dependency granted so an operation can function is not necessarily a capability the company selected or should see in its navigation.

**How to apply:** Preserve dependencies when calculating effective permissions, but pass the pack or unit’s explicit feature ids to tests, navigation, and tab guards; never infer visible pack scope from dependency-expanded role permissions.

Pour Paie, une entreprise sans sélection explicite ne doit pas recevoir toutes les fonctionnalités du module par défaut : l’absence de sélection signifie qu’aucune fonctionnalité Paie n’est visible.

**Why:** Le fallback global vers `module.features` transforme une absence de configuration en activation des sept écrans Paie, ce qui donne à l’administrateur une capacité qu’il n’a pas choisie.

**How to apply:** Conserver un tableau vide comme sélection explicite pour Paie, afficher un état vide dans la page et ne jamais reconstruire la navigation à partir de la définition complète du module.

Feature manifests must expose stable ids separately from display labels; navigation and access checks should consume the manifest ids rather than slugging translated labels.

**Why:** Slugging labels such as “Tableau de bord” or “Paramètres” produces ids that no longer match pack selections like `dashboard` or `parametres`, silently hiding authorized features or showing the wrong scope.

**How to apply:** Keep one id/label definition for each module, use it in feature option builders and navigation, and add a regression test for a restricted pack that excludes a neighboring feature.

Dans l’espace entreprise, le menu global regroupe chaque module autorisé avec ses fonctionnalités accessibles directement dessous, comme dans le parcours employé. Les administrateurs d’entreprise et les employés doivent utiliser la même navigation détaillée, filtrée par leurs droits.

**Why:** Une entreprise doit pouvoir atteindre immédiatement ses fonctionnalités sans ouvrir chaque module au préalable, tout en gardant une lecture claire par sections de module.

**How to apply:** Construire une section par module autorisé, afficher uniquement les fonctionnalités sélectionnées ou permises, conserver les paramètres administratifs nécessaires, et réutiliser les mêmes identifiants/routes que les onglets internes. Si un module autorisé n’a aucune sélection détaillée héritée, conserver son entrée parent vers sa route de base sans inventer de sous-fonctionnalités.

Le registre de module doit dériver l’identité métier du catalogue et porter les informations de route, d’icône et de type d’écran ; navigation et routeur ne doivent pas recopier une liste de modules.

**Why:** Un module ajouté dans une seule liste peut apparaître dans le catalogue sans route, ou être routable sans apparaître dans le menu, ce qui crée des écrans inaccessibles et des régressions silencieuses.

**How to apply:** Lorsqu’un module est ajouté, enregistrer son identifiant dans le catalogue et sa configuration d’exécution dans le registre, puis laisser les tests de parité vérifier la route et la navigation.