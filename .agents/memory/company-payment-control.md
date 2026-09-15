---
name: Company payment control
description: Payment availability is a separate MAXIMUS-controlled capability, distinct from module access and subscription state.
---

Company payment access must be stored and checked independently from module activation. MAXIMUS can disable new payment operations for one company without deleting its orders, wallet history, or other module data.

**Why:** A company may keep its business modules open while payment collection or payouts are temporarily disabled for compliance, configuration, or operational reasons.

**How to apply:** Protect every operation that creates a provider charge or payout with the company payment setting. Keep read-only history and reconciliation views available, and leave subscription billing separate because it pays for the platform rather than the company’s own payment capability.