---
name: Sérialisation du GPS Chauffeur
description: Garder un suivi GPS explicite au premier plan et éviter les transitions concurrentes après un retour des réglages Android.
---

Les demandes de permission peuvent ouvrir les réglages Android puis ramener l’application au premier plan pendant qu’une activation GPS manuelle est encore en cours. Les mutations du service de localisation (activer, reprendre, arrêter) doivent passer par une file sérialisée commune, et les reprises AppState doivent être dédupliquées.

**Why:** Un démarrage concurrent du foreground service peut provoquer une erreur native qui ferme l’application et échappe aux `catch` JavaScript.

**How to apply:** Garder la sérialisation dans le service de localisation, pas uniquement dans un écran. Les tests de concurrence doivent utiliser la même fabrique que les entrées de production, sinon ils peuvent passer sans valider leur câblage. Tester aussi le retour des réglages Android et les événements AppState rapprochés sur un appareil réel; les journaux Metro ne valident pas un crash natif.

Ne pas considérer l’ancien indicateur de suivi comme un consentement GPS explicite : la version 1.0.8 pouvait lancer la reprise depuis le seul statut serveur `AVAILABLE`, puis enregistrer le suivi comme activé. Le GPS Chauffeur est limité au premier plan : suspendre la lecture quand l’application quitte l’état actif, sans supprimer le consentement; l’arrêt volontaire, lui, le supprime. Si un chauffeur disponible quitte l’application, mettre sa disponibilité en pause, sauf course attribuée ou en cours; au retour, ne pas le rendre disponible automatiquement.

**Why:** L’ancien indicateur peut avoir été écrit automatiquement sans action volontaire du chauffeur; le réutiliser relancerait le GPS après mise à jour. Garder le consentement lors d’une suspension temporaire évite de redemander inutilement l’autorisation au retour dans l’application, sans réactiver le suivi en arrière-plan. La mise en pause évite de laisser un chauffeur sans GPS fraîchement actualisé apparaître disponible; un statut de course reste intact pour ne pas abandonner une course.

**How to apply:** Toute évolution du GPS doit garder séparés le consentement durable du chauffeur et l’état d’exécution. Ne démarrer la lecture que lorsque l’application est active; sérialiser activation, suspension, reprise et arrêt. Mettre en pause `AVAILABLE` à chaque transition hors premier plan si les permissions le permettent et s’il n’y a pas de course attribuée/en cours; exiger une action du chauffeur pour redevenir disponible. Après une migration sans consentement fiable, arrêter l’ancien mécanisme et demander une activation explicite.

Une lecture Android en cache peut être périmée même si le watcher la transmet. Vérifier le timestamp de chaque échantillon avant le PATCH GPS : l’API horodate sa réception, pas la mesure. Un seuil de déplacement non nul peut aussi empêcher les positions d’être renouvelées lorsqu’un chauffeur reste immobile; le `timeInterval` seul ne garantit pas un heartbeat serveur.

**Why:** Le serveur écarte les coordonnées trop anciennes même si le téléphone affiche encore le GPS comme activé. Sans validation avant l’envoi, un ancien point en cache peut recevoir un horodatage serveur récent et donner une fausse confirmation GPS.

**How to apply:** Rejeter avant chaque PATCH les points invalides, périmés ou datés dans le futur; publier une position comme active seulement après confirmation API. Garder des mises à jour périodiques au premier plan sans seuil de distance et tester un point Android en cache, un chauffeur immobile et une requête GPS refusée.