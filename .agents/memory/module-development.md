---
name: Module development
description: Rules for making future MAXIMUS modules reusable by any authorized company and easy for a human developer to extend.
---

A MAXIMUS module is implemented once and enabled per authorized company. KORA is only demo data; it must never be a module-specific fallback or hardcoded tenant.

**Why:** Treating modules as separate applications or client-specific copies creates duplicated code, inconsistent permissions, and cross-company data risks.

**How to apply:** Give each module a stable id, keep its Laravel routes/controllers/services/tests and frontend API/pages grouped, require server-side company context, separate activation from role permissions, and ship the module with a human-readable guide and isolation tests.