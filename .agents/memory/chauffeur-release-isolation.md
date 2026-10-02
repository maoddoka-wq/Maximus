---
name: Isolation des releases APK Chauffeur
description: Préserver le GPS déjà publié lorsque la branche de travail contient des changements Chauffeur non publiés.
---

Avant de créer un tag Android Chauffeur, comparer le candidat au dernier tag APK publié. Si la branche de travail contient des modifications GPS non approuvées, baser la release sur le dernier tag et n’y appliquer que les commits explicitement demandés. Si le correctif ne peut pas être isolé, arrêter avant publication.

**Why:** Les branches de développement et les tags APK peuvent suivre des historiques différents. Construire depuis la branche principale peut embarquer des changements GPS qui ne faisaient pas partie de l’application déjà distribuée. La connexion GitHub Replit peut publier un tag annoté via l’API Git Data; sa création a déclenché le workflow `push` du tag sans pousser la branche candidate.

**How to apply:** Vérifier que seuls les fichiers approuvés diffèrent du dernier APK. Si l’authentification Git locale échoue mais que la connexion GitHub Replit fonctionne, créer blobs, tree, commit parenté au dernier tag, tag annoté puis ref via l’API; ne pas pousser la branche candidate. Vérifier ensuite le workflow et l’APK publiée.