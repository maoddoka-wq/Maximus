---
name: Rapprochement GPS Taxi
description: Règles de localisation interne et de sélection du chauffeur pour le module Transport.
---

La sélection Taxi utilise uniquement les coordonnées GPS envoyées par l’application et un calcul de distance interne côté serveur. Une position de chauffeur est considérée comme utilisable pendant cinq minutes ; le chauffeur doit aussi être actif, ne pas avoir de course en cours et disposer d’un véhicule disponible.

**Why:** La relation client-chauffeur doit rester directe sans faire de MAXIMUS un intermédiaire ni dépendre d’une API cartographique externe.

**How to apply:** Toute nouvelle entrée de course doit recevoir la position du client depuis son appareil, refuser une position absente ou obsolète, et ne retourner au client que les coordonnées de contact du chauffeur effectivement affecté.