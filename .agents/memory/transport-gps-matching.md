---
name: Rapprochement GPS Taxi
description: Règles de localisation interne et de sélection du chauffeur pour le module Transport.
---

La sélection Taxi utilise uniquement les coordonnées GPS envoyées par l’application et un calcul de distance interne côté serveur. Une position de chauffeur est utilisable pendant la durée configurée pour l’entreprise (cinq minutes par défaut) ; le chauffeur doit aussi être actif, ne pas avoir de course en cours et disposer d’un véhicule disponible.

**Why:** La relation client-chauffeur doit rester directe sans faire de MAXIMUS un intermédiaire ni dépendre d’une API cartographique externe.

**How to apply:** Toute nouvelle entrée de course doit recevoir la position du client depuis son appareil, refuser une position absente ou obsolète, et ne retourner au client que les coordonnées de contact du chauffeur effectivement affecté.

Un chauffeur ne peut devenir disponible qu’avec une position acceptée par l’API, dans Dakar et encore fraîche. Les transitions automatiques après annulation, fin de course ou expiration d’offre appliquent la même vérification ; une fiche nouvellement créée commence en pause.

**Why:** Le statut `AVAILABLE` seul peut rendre un chauffeur éligible aux clients malgré une position absente ou périmée. Les transitions automatiques ne doivent pas contourner le contrôle manuel.

**How to apply:** Réutiliser la règle serveur de fraîcheur configurée pour toute transition vers `AVAILABLE`; repasser en `PAUSED` si elle échoue, et n’afficher le GPS comme actif côté client qu’après confirmation de l’API.

Ne jamais republier périodiquement la dernière position GPS connue en la faisant passer pour une nouvelle ; les décimales PostgreSQL doivent aussi être converties en nombres avant de les exposer aux cartes.

**Why:** Republier une position mémorisée rafraîchit artificiellement `location_updated_at` et permettait de distribuer un point obsolète ; les colonnes décimales peuvent être sérialisées comme chaînes et perturber les composants cartographiques.

**How to apply:** Demander une nouvelle lecture GPS lors des rafraîchissements, refuser côté serveur les positions hors Dakar, et caster latitude/longitude dans chaque payload Transport.

Le suivi GPS dans un navigateur mobile ne peut pas garantir des relevés continus écran verrouillé : Android peut suspendre les timers et callbacks de la page. Une erreur temporaire de lecture ne doit pas invalider immédiatement un dernier point encore frais ; reprendre la lecture au retour au premier plan, sans republier une position en cache pour rafraîchir artificiellement son horodatage.

**Why:** Un point valide pendant cinq minutes peut coexister avec un délai ou un timeout ponctuel du navigateur. Confondre les deux affiche à tort « GPS indisponible », tandis qu’une position mise en cache peut donner une impression trompeuse de suivi continu.

**How to apply:** Afficher un état de reprise pour les timeouts/positions temporairement indisponibles, réserver l’état bloqué aux refus explicites et aux erreurs d’acceptation, et demander une nouvelle lecture après `visibilitychange` ou `focus`. Pour un suivi garanti écran verrouillé, prévoir une application native avec autorisation de localisation en arrière-plan.

Le bouton de guidage chauffeur doit ouvrir uniquement la première étape, depuis la position actuelle du téléphone vers les coordonnées GPS de l’arrêt client ; la destination finale ne devient une étape qu’après la prise en charge.

**Why:** utiliser la destination finale comme cible initiale, avec l’arrêt client comme waypoint, envoyait le chauffeur vers le mauvais lieu malgré des coordonnées valides.

**How to apply:** générer une URL de navigation avec `destination` égal au couple latitude/longitude du pickup, sans waypoint de destination finale, et refuser le guidage si le pickup n’a pas de coordonnées.

Les tuiles standard `tile.openstreetmap.org` peuvent être refusées par leur politique d’utilisation ; le fond Leaflet doit utiliser une source publique compatible et rester séparé des géométries GPS internes.

**Why:** les lignes et marqueurs peuvent être correctement rendus alors que le fond cartographique reste vide si le fournisseur de tuiles bloque les requêtes.

**How to apply:** conserver l’attribution du fournisseur de tuiles, tester le chargement du fond sur mobile et appeler `invalidateSize` après les transitions d’affichage plein écran.