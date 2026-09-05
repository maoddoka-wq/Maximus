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

Each module owns its named business packs; sector presets select those existing module packs directly. A selected pack is a starting role template, not a permanent lock: the company can add or remove features and create independent roles.

**Why:** Pack names and permissions are defined once in the module catalog, while real companies need to adapt a template to their organization without duplicating the catalog or being forced into one role.

**How to apply:** Keep the hierarchy explicit as module → module pack → editable feature selection → company roles; show packs only after their module is selected, persist the selected composition with the signup request or unit, and let administrators review the resulting permissions.

Legacy packs without an explicit feature permission map are interpreted as view-only when they are edited, tested, or copied into an onboarding request.

**Why:** The new pack contract must not silently grant create or modify rights to existing data that only recorded a feature list.

**How to apply:** Treat a missing or empty feature permission as `voir` for included features, and persist the explicit permission map on the next save or signup request.