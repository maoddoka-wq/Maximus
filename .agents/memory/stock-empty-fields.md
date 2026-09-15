---
name: Champs vides des mouvements Stock
description: Gestion des champs texte optionnels lors de la création des mouvements de stock.
---

Les champs texte optionnels qui ont une valeur par défaut non nullable en base doivent être normalisés côté serveur avant l’insertion. Ne pas laisser une chaîne vide transformée en `null` remplacer le défaut SQL.

**Why:** Le middleware Laravel `ConvertEmptyStringsToNull` transforme notamment la référence et le commentaire vides du formulaire de sortie en `null`, ce qui fait échouer PostgreSQL sur les colonnes non nullables.

**How to apply:** Construire explicitement la ligne `stock_movements` et utiliser `''` pour `reason`, `reference` et `comment` lorsque les valeurs entrantes sont absentes ou nulles. Garder `null` uniquement pour les colonnes réellement nullable.