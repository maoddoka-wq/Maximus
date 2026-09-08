---
name: Champs vides du catalogue
description: Les valeurs vides envoyées par les formulaires Laravel peuvent devenir null avant insertion en base.
---

Les champs texte non nuls du catalogue doivent normaliser explicitement `null` en chaîne vide avant la conversion snake_case et l’insertion.

**Why:** Le middleware Laravel ConvertEmptyStringsToNull transforme une chaîne vide en `null`; une valeur par défaut définie dans `array_merge` est alors écrasée et une colonne non nullable rejette la création.

**How to apply:** Pour chaque payload catalogue, distinguer champ absent (mise à jour partielle) et champ présent à `null` (valeur vide explicite), puis normaliser ce dernier côté serveur.