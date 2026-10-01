---
name: Visibilité de l’espace entreprise
description: Les entrées Contrôle, Organisation et Guide, ainsi que l’onglet Abonnement, sont masquables par entreprise.
---

La visibilité des fonctionnalités transverses de l’espace entreprise est une configuration propre à chaque entreprise. Contrôle, Organisation, Guide et l’onglet Abonnement sont masquables séparément, avec visibilité par défaut, menu/onglets filtrés et blocage des routes directes lorsque l’entrée est masquée. Masquer Abonnement ne doit pas masquer toute la rubrique Organisation.

**Why:** Ces fonctionnalités ne sont pas des modules métier et ne doivent pas être déduites des modules autorisés. Une entreprise peut avoir besoin de ses modules opérationnels sans exposer ses outils de coordination ou de paramétrage.

**How to apply:** La configuration centrale est la source de vérité. La synchronisation dédiée transmet uniquement `hiddenWorkspaceFeatures` à l’entreprise correspondante et met à jour l’état local sans remplacer le reste de l’app-state. Pour Abonnement, reconnaître précisément la route Organisation avec `tab=subscription`; la route Organisation sans ce paramètre garde son contrôle de visibilité indépendant. Ne pas confondre ces réglages avec les comptes, rôles, employés ou unités d’organisation.