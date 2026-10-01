---
name: Idempotence des ventes comptoir
description: Règle de conservation des clés d’idempotence pour les ventes POS.
---

**Rule:** Reuse one idempotency key for retries of the same company-scoped sale payload. The server must compare normalized lines, customer, payment method/reference and cash amount, and reject a reused key with different content. Use a distinct key for a changed payload, and clear the retry mapping only after the server confirms success.

**Why:** A network failure can leave the client unsure whether the transaction committed. Generating a new key for an identical retry can create a duplicate sale and debit stock twice; silently returning an earlier sale for a changed payment reference can corrupt the audit trail.

**How to apply:** When adding POS fields or changing the checkout flow, fingerprint the company and normalized sale payload on the client, retain its key across retries, and enforce the same-payload rule on the server. Insert the sale, inventory adjustment and movement record atomically.