---
name: Compatibilité des réponses Taxi
description: Le client public doit tolérer les enveloppes de réponse Taxi historiques.
---

La frontière frontend du Transport normalise les réponses de création, lecture et annulation avant de les utiliser. Elle accepte la forme Laravel `{ trip, matched, message }`, une forme enveloppée dans `data`, et l’ancien format où la course est directement à la racine, puis refuse explicitement une réponse sans identifiant.

**Why:** Des versions d’API déjà publiées peuvent renvoyer une course directement alors que le frontend récent attend une enveloppe ; lire `trip.id` sans normalisation produit une erreur utilisateur trompeuse.

**How to apply:** Toute nouvelle méthode publique Taxi qui consomme une course doit passer par le même normaliseur ou retourner un contrat équivalent avant d’accéder à `id`.