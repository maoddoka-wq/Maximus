---
name: Périmètre des dossiers employés
description: Règle transversale d’accès aux employés et aux opérations qui leur sont attribuées.
---

Dans tous les modules, un compte employee ne peut consulter ou modifier que ses propres dossiers employés et ne doit jamais se voir proposer un sélecteur d’employé. Un sector_manager est limité aux employés de ses unités explicitement autorisées et de leurs unités descendantes. Un company_admin peut agir sur tous les employés de son entreprise. Les limites doivent être appliquées par l’API, pas seulement par les listes de l’interface.

**Why:** Des filtres d’interface ou des permissions CRUD générales ne protègent pas contre un identifiant `employeeId` forgé, une requête directe ou un snapshot d’état partagé modifié.

**How to apply:** Pour chaque lecture, liste, sélecteur, création, mise à jour, suppression et transition qui référence un employé, dériver l’identité de l’acteur depuis la session, imposer son périmètre de rôle sur toute la requête et ne transmettre aucun choix d’employé à un compte employee. Les données sans relation employé explicite restent à traiter selon les permissions métier du module, sans les confondre avec des dossiers employés.