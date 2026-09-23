---
name: Séparation Bien et Annonce Immobilier
description: Règle métier séparant le patrimoine interne des publications commerciales.
---

Un Bien immobilier est une fiche patrimoniale interne et une Annonce est une publication commerciale rattachée à un Bien ; une fiche Bien peut recevoir plusieurs annonces au fil du temps.

**Why:** Les caractéristiques physiques, le prix et les notes internes ne suivent pas le même cycle de vie que le titre, le contenu, le statut de diffusion et la visibilité publique d’une annonce.

**How to apply:** Persister et autoriser séparément les Biens et les Annonces. Une annonce doit référencer un Bien actif pour être créée ou publiée, et les notes internes du Bien ne doivent jamais être exposées dans la vitrine.