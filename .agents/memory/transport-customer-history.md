---
name: Historique client Taxi
description: Règles d’identité et d’accès pour l’historique et l’annulation des courses publiques.
---

Les courses Taxi publiques peuvent rester accessibles aux invités pour la création et le suivi local, mais l’historique serveur et l’annulation exigent une session client liée à la boutique. La course mémorise l’identifiant du client quand cette session existe, puis chaque lecture ou mutation vérifie simultanément l’entreprise et le client propriétaire. Seuls les statuts REQUESTED, OFFERED et ASSIGNED sont annulables.

**Why:** Un identifiant de course conservé dans le navigateur ou un numéro de téléphone ne suffit pas à empêcher l’accès ou l’annulation d’une course par un autre client.

**How to apply:** Toute nouvelle action client Taxi doit réutiliser la session e-commerce et le périmètre de la boutique ; ne pas transformer le suivi invité en historique global.