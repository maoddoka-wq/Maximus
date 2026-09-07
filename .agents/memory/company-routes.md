---
name: Routes entreprise canoniques
description: Convention de routage des espaces entreprise et compatibilité des anciennes URLs.
---

Les routes fonctionnelles utilisent `/entreprise/...`. Les anciennes URLs `/kora/...` ne servent qu’à rediriger vers la forme canonique et ne doivent pas apparaître dans les liens, menus ou libellés nouveaux.

**Why:** La migration de marque et de périmètre vers MAXIMUS doit éviter de recréer une dépendance fonctionnelle à KORA tout en conservant les anciens liens entrants.

**How to apply:** Comparer le chemin sans query string, normaliser un ancien préfixe à l’entrée du routeur, puis générer toute navigation et tout lien avec `/entreprise`. Pour une boutique, afficher dans ses paramètres l’URL publique complète construite avec l’origine courante et `/shop/{slug}`; le changement de nom recalcule le slug tant qu’il n’a pas été personnalisé.