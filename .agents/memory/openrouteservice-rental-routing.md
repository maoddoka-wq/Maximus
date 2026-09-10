---
name: Routage OpenStreetMap des locations
description: Fournisseur cartographique utilisé par le calculateur de location automobile
---

Le calculateur de location automobile utilise OpenRouteService avec les données OpenStreetMap : géocodage séparé du départ et de la destination, puis matrice routière `driving-car`. Le résultat est converti en kilomètres et minutes avant le calcul tarifaire.

**Why:** Google Maps a été écarté pour éviter sa configuration et ses coûts associés, tout en conservant un calcul routier réel côté serveur.

**How to apply:** La clé `OPENROUTESERVICE_API_KEY` doit rester un secret serveur. En cas de clé absente, d’adresse introuvable ou de réponse invalide, le devis doit échouer explicitement ; ne jamais utiliser une distance à vol d’oiseau ou une valeur par défaut.