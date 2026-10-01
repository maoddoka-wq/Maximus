---
name: Renouvellement E-commerce
description: Règles de renouvellement et de validation des périodes payées de l’abonnement E-commerce MAXIMUS.
---

Le renouvellement E-commerce reste une action manuelle via un checkout DiamanoPay ponctuel. Une période de 30 jours ne commence ou ne s’étend qu’après confirmation serveur vérifiée; un renouvellement anticipé ajoute les 30 jours à l’échéance future existante. Ne pas simuler un débit automatique sans mandat réutilisable documenté et testé.

**Why:** l’intégration disponible ne documente pas de mandat de paiement réutilisable; un checkout ponctuel ne constitue pas une autorisation de prélèvement récurrent.

**How to apply:** conserver un renouvellement explicite et une extension idempotente après confirmation fournisseur. Toute facturation automatique exige d’abord une capacité de mandat vérifiée côté fournisseur.