---
name: Fréquence du scheduler Windows
description: Fréquence et comportement attendus du déclencheur de synchronisation des installations Windows.
---

Le déclencheur Windows doit appeler `schedule:run` toutes les cinq minutes, en cohérence avec la tâche Laravel, et s’exécuter sans fenêtre visible.

**Why:** Un déclenchement chaque minute ouvrait trop fréquemment une fenêtre sur certaines installations et ajoutait une charge inutile alors que la synchronisation applicative est déjà limitée à cinq minutes.

**How to apply:** Conserver cinq minutes comme valeur par défaut des scripts d’enregistrement ; réenregistrer la tâche existante après toute mise à jour, car le Planificateur Windows conserve l’ancienne fréquence.