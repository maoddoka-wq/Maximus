---
name: Périmètre des dossiers employés
description: Règle transversale d’accès aux employés et aux opérations qui leur sont attribuées.
---

Dans tous les modules, un compte employee ne peut consulter ou modifier que ses propres dossiers employés et ne doit jamais se voir proposer un sélecteur d’employé. Un sector_manager est limité aux employés de ses unités explicitement autorisées et de leurs unités descendantes. Un company_admin peut agir sur tous les employés de son entreprise. Les limites doivent être appliquées par l’API, pas seulement par les listes de l’interface.

**Why:** Des filtres d’interface ou des permissions CRUD générales ne protègent pas contre un identifiant `employeeId` forgé, une requête directe ou un snapshot d’état partagé modifié.

**How to apply:** Pour chaque lecture, liste, sélecteur, création, mise à jour, suppression et transition qui référence un employé, dériver l’identité de l’acteur depuis la session, imposer son périmètre de rôle sur toute la requête et ne transmettre aucun choix d’employé à un compte employee. Les données sans relation employé explicite restent à traiter selon les permissions métier du module, sans les confondre avec des dossiers employés.

Dans Contrôle & coordination, un compte `employee` peut consulter et mettre à jour le statut de ses tâches assignées sans permission générale de lecture du module. Il ne peut pas créer de tâche ni consulter ou modifier la tâche d’un autre employé. Les managers non administrateurs restent soumis à la permission Voir/Créer/Modifier.

**Why:** Le filtrage employé par tâche est une autorisation distincte du droit général de consulter le module; l’exiger empêchait l’employé de recevoir et traiter son travail.

**How to apply:** Les API de coordination doivent filtrer les tâches par l’identifiant employé de session, limiter événements et audit aux tâches filtrées, et autoriser les transitions uniquement pour ces tâches; garder les permissions CRUD du module pour les managers et les actions de création.