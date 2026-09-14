---
name: GPS et annulation Taxi publics
description: Contraintes durables du parcours public de demande et de suivi Taxi.
---

Le GPS public doit utiliser `watchPosition` en haute précision, retenir le meilleur relevé reçu dans la zone de Dakar, arrêter proprement le watcher et afficher la précision disponible. Le serveur reste l’autorité pour la zone.

L’annulation publique doit utiliser un jeton chiffré lié à l’entreprise et à la course, conservé localement avec la demande. Elle est limitée aux états avant démarrage, et la libération d’un véhicule réservé doit se faire dans la même transaction que le passage à `CANCELLED`.

Les suggestions de destination doivent retourner plusieurs lieux Dakar avec leurs coordonnées géographiques. Après sélection, le devis doit utiliser ces coordonnées signées côté serveur plutôt que de refaire confiance uniquement au texte saisi.

**Why:** un seul relevé GPS mobile peut être imprécis, et un `tripId` lisible dans le navigateur ne prouve pas que le client est propriétaire de la demande.

**How to apply:** pour toute évolution du suivi public Taxi, conserver la validation serveur Dakar, la réhydratation du jeton après actualisation et le refus d’annulation dès que la course est commencée.