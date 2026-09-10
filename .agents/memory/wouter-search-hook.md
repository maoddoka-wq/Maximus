---
name: Recherche Wouter
description: Contrat du hook de query string utilisé par la navigation React de MAXIMUS.
---

Avec Wouter 3, `useSearch()` renvoie directement la chaîne de recherche complète. Il ne faut pas écrire `const [search] = useSearch()`, car cela ne conserve que le premier caractère et casse les navigations qui changent uniquement la query string.

**Why:** la navigation Paie et plusieurs onglets partageaient le même chemin et ne lisaient donc plus la fonctionnalité demandée après un premier clic.

**How to apply:** utiliser `const search = useSearch()` dans les composants et utilitaires qui lisent `feature`, `tab` ou tout autre paramètre d’URL.