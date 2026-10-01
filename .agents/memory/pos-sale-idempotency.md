---
name: Idempotence des ventes comptoir
description: Règle de conservation des clés d’idempotence pour les ventes POS en espèces.
---

**Rule:** Reuse one idempotency key for retries of the same company-scoped sale payload. Use a distinct key for a changed payload, and clear the retry mapping only after the server confirms success.

**Why:** A network failure can leave the client unsure whether the transaction committed. Generating a new key for an identical retry can create a duplicate sale and debit stock twice.

**How to apply:** When adding POS fields or changing the checkout flow, fingerprint the company and normalized sale payload on the client, retain its key across retries, and keep the server transaction idempotent.