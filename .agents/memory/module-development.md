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

Sector presets can contain named business packs that group modules and features for a specific trade or activity. The signup flow should apply a selected pack as a starting point while keeping the company’s ability to add or remove features before submitting its request.

**Why:** A sector-level business pack represents the company’s operating model; it is different from an employee role and should be validated as part of the company’s module request.

**How to apply:** Keep the hierarchy explicit as sector → business pack → modules → features, persist the selected pack with the signup request, and let the administrator review the resulting feature set before activation.