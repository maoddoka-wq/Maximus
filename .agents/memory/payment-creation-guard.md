---
name: Garde de création de paiement
description: Règle de concurrence du checkout e-commerce avant la redirection DiamanoPay.
---

La création d’un checkout e-commerce doit verrouiller la commande pendant la vérification et la création de charge, puis réutiliser la charge `PENDING` existante. La clé d’idempotence doit rester stable pour une première tentative et être distincte seulement lors d’une nouvelle tentative après échec.

**Why:** Une protection frontend contre le double clic ne couvre pas deux requêtes simultanées, un onglet dupliqué ou une reprise réseau. Sans verrou serveur, deux charges peuvent être créées avant que la première écrive son identifiant.

**How to apply:** Conserver l’unique charge et l’URL de checkout sur la commande, confirmer les paiements uniquement par webhook ou consultation de statut côté serveur, et ne pas créer de nouveaux moyens de paiement tant que DiamanoPay ne les expose pas réellement.