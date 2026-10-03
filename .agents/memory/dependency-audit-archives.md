---
name: Scans et archives de code
description: Interpréter les alertes de dépendances lorsque le dépôt contient des copies historiques imbriquées.
---

Le scan de dépendances peut inclure les lockfiles des archives extraites et
compter plusieurs fois le même avis. Distinguer les dépendances du runtime actif,
les outils de développement et les copies historiques avant de prioriser les corrections.

**Why:** Un audit signalait de nombreux avis CommonMark provenant des copies
Windows, alors que la version du Laravel actif était déjà corrigée. Une mise à
jour du runtime ne résout pas les alertes attachées aux anciens lockfiles archivés.

**How to apply:** Dédupliquer les avis par paquet/version, identifier le lockfile
qui les porte et vérifier séparément le runtime actif. Ne pas modifier dix
copies historiques ni supprimer une archive simplement pour obtenir un scan vert.