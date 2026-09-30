---
name: Isolation des releases APK Chauffeur
description: Préserver le GPS déjà publié lorsque la branche de travail contient des changements Chauffeur non publiés.
---

Avant de créer un tag Android Chauffeur, comparer le candidat au dernier tag APK publié. Si la branche de travail contient des modifications GPS non approuvées, baser la release sur le dernier tag et n’y appliquer que les commits explicitement demandés. Si le correctif ne peut pas être isolé, arrêter avant publication.

**Why:** Les branches de développement et les tags APK peuvent suivre des historiques différents. Construire depuis la branche principale peut embarquer des changements GPS qui ne faisaient pas partie de l’application déjà distribuée.

**How to apply:** Vérifier que seuls les fichiers approuvés diffèrent du dernier APK. Pousser uniquement le tag nécessaire au workflow Android si une mise à jour de la branche principale provoquerait un déploiement non demandé.