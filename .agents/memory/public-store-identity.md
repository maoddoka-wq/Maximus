---
name: Public storefront identity
description: Store names may repeat across companies, but every public storefront URL must remain globally unique.
---

Le nom visible d’une boutique est une donnée métier propre à l’entreprise et peut être identique à celui d’une autre entreprise. Le slug public est une adresse globale : lorsqu’un slug demandé existe déjà, conserver les deux boutiques et attribuer automatiquement un suffixe au nouveau slug au lieu de modifier ou masquer la première boutique.

**Why:** Les routes publiques par slug ne contiennent pas d’identifiant d’entreprise. Deux slugs identiques font donc pointer les vitrines vers la mauvaise entreprise et donnent l’impression que les données ont été remplacées.

**How to apply:** Résoudre les boutiques d’administration par `company_id`, garder une contrainte globale sur les slugs publics et tester systématiquement deux entreprises qui utilisent le même nom.