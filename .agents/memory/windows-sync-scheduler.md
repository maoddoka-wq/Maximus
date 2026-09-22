---
name: Fréquence du scheduler Windows
description: Fréquence et comportement attendus du déclencheur de synchronisation des installations Windows.
---

Le déclencheur Windows doit appeler `schedule:run` toutes les cinq minutes, en cohérence avec la tâche Laravel, et s’exécuter sans fenêtre visible.

**Why:** Un déclenchement chaque minute ouvrait trop fréquemment une fenêtre sur certaines installations et ajoutait une charge inutile alors que la synchronisation applicative est déjà limitée à cinq minutes.

**How to apply:** Conserver cinq minutes comme valeur par défaut des scripts d’enregistrement ; réenregistrer la tâche existante après toute mise à jour, car le Planificateur Windows conserve l’ancienne fréquence.

Le premier déclenchement doit aussi être aligné sur la prochaine minute multiple de cinq ; démarrer simplement une minute après l’enregistrement puis répéter toutes les cinq minutes peut rester hors des créneaux `everyFiveMinutes()` de Laravel.

**Why:** Le Planificateur Windows peut exécuter la tâche à 14:37, 14:42 et 14:47, alors que Laravel n’exécute la tâche planifiée qu’à 14:35, 14:40 et 14:45. La tâche semble active mais ne lance jamais la synchronisation.

**How to apply:** Calculer le prochain créneau depuis minuit avant de créer `New-ScheduledTaskTrigger`, puis réenregistrer la tâche après toute modification du script.