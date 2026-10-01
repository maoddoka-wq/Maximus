---
name: Ordre des releases Chauffeur
description: Règle de sélection de l’APK la plus récente pour le vérificateur de versions Chauffeur.
---

Ne jamais interpréter l’ordre renvoyé par l’API GitHub des releases comme un ordre de versions. Filtrer les releases stables valides avec un APK, puis choisir le numéro sémantique le plus élevé; ignorer les brouillons et préversions. Le contrôle de version et le téléchargement doivent sélectionner la même release.

**Why:** L’API GitHub a placé des tags Chauffeur plus anciens avant une release plus récente. Retourner le premier élément admissible faisait croire à l’application qu’elle était à jour.

**How to apply:** Quand le format des tags ou les sources de release changent, conserver une comparaison numérique MAJOR.MINOR.PATCH et un test avec une liste volontairement désordonnée.