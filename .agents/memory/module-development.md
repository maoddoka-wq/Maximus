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

Module employee profiles are recommendations, not automatic role or employee creation. The administrator confirms a suggested profile by using it as a starting point and can add or remove its permissions before saving.

**Why:** Automatic creation could add roles that do not match an organization’s structure or grant more access than its administrator intended.

**How to apply:** Store profile templates with the module definition, expose them as optional presets in role creation, and keep the final company role and permission configuration under explicit administrator control.