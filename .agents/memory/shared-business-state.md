---
name: État métier partagé par rôle
description: Règle de persistance des données métier saisies par les employés et consultées par les niveaux hiérarchiques.
---

Les collections métier génériques sont une source unique par entreprise : un employé, un manager et la direction consultent le même enregistrement, tandis que les permissions déterminent les actions et le périmètre de consultation.

**Why:** L’état partagé refusait auparavant les écritures des employés et de la direction générale, et ignorait les listes vides ; une saisie ou une suppression pouvait donc ne pas parvenir aux autres rôles.

**How to apply:** Toute évolution de la persistance métier doit conserver l’isolation par entreprise, accepter les écritures des rôles autorisés et distinguer une clé absente (mise à jour partielle) d’une collection explicitement vide (suppression réelle).