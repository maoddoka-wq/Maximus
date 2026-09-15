---
name: Transport recurring payment boundary
description: Automatic Transport renewals require a provider mandate or reusable payment token; a one-time checkout must never be presented as automatic billing.
---

The Transport subscription must not attempt automatic monthly renewal through the existing DiamanoPay one-time charge endpoint. The implementation needs a documented recurring-payment contract, such as a provider mandate or reusable payment method identifier, before scheduling or charging renewals.

**Why:** The current integration creates a checkout and confirms it through webhook or status lookup, but does not expose a reusable payment instrument. Automatically creating a new checkout would still require a human action and would misrepresent the billing behavior.

**How to apply:** Keep Transport subscription state separate from module access. Add automatic renewal only after the provider contract is confirmed; otherwise expose an explicit manual checkout or a clearly blocked configuration state.