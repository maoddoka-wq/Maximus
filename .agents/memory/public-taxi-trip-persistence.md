---
name: Restauration des courses publiques
description: Persistance et restauration d’une demande Taxi dans la boutique publique.
---

Une demande Taxi active doit rester récupérable après navigation, rafraîchissement ou erreur réseau temporaire. Le stockage client ne doit être supprimé qu’après confirmation serveur d’un état terminal (`COMPLETED` ou `CANCELLED`) ou lorsque le serveur confirme que la course n’existe plus.

**Why:** Supprimer la demande au premier échec de lecture transforme une indisponibilité momentanée de l’API en perte apparente de course pour le client.

**How to apply:** Restaurer l’identifiant et le jeton depuis le stockage local au montage, afficher un état de récupération, conserver la donnée en cas d’erreur réseau et permettre une nouvelle tentative sans recréer la course.