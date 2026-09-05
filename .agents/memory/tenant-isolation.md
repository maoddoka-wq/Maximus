---
name: Tenant isolation
description: Rules for preventing one MAXIMUS company from reading or changing another company's data.
---

Every authenticated business route must derive its company context from the server-side session actor. A client-supplied companyId may only confirm the actor's company; it must never select a different company. MAXIMUS administrators may select an explicit company context, while company users remain bound to their own company. Public storefront routes must be separate from internal management routes.

**Why:** Querying another company identifier is an easy cross-tenant data leak when controllers trust frontend parameters or expose unprotected bootstrap endpoints.

**How to apply:** Put authentication and company-context middleware on each internal module, scope every read/write by the resolved company, and add a cross-company `403` test whenever a new module is introduced.