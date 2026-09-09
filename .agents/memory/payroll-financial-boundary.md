---
name: Frontière financière de la paie
description: Règles durables pour le financement, la confidentialité des comptes et l’exécution des virements Paie.
---

Le portefeuille de paie ne doit être crédité qu’après confirmation signée d’une recharge par le fournisseur de paiement. Les demandes de virement réservent les fonds atomiquement, puis libèrent la réservation en cas d’échec. Les numéros de compte sont chiffrés au repos et ne doivent être renvoyés au frontend que sous forme masquée.

**Why:** Un simple registre local ou un crédit manuel créerait un solde financier fictif et exposerait des données de paiement sensibles.

**How to apply:** Toute évolution Paie doit conserver le cycle recharge confirmée → solde disponible → préparation → validation → réservation → exécution idempotente.