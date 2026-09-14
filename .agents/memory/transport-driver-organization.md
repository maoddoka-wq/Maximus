---
name: Qualification des chauffeurs depuis Organisation
description: Source de vérité pour l’identité des chauffeurs et leur qualification Transport.
---

Un chauffeur Taxi doit toujours correspondre à un compte employé actif créé dans Organisation. Transport ne crée pas une identité autonome : il sélectionne l’employé et ajoute uniquement les informations propres à la conduite, comme le permis et le statut. Le véhicule est ensuite rattaché à ce chauffeur ; le matching public ne doit jamais choisir un véhicule indépendamment du chauffeur GPS.

**Why:** Le GPS, les permissions et la responsabilité opérationnelle dépendent du compte employé ; une fiche chauffeur indépendante pouvait être impossible à localiser ou à rattacher à une personne réelle. Un véhicule choisi séparément pouvait aussi former un équipage incohérent.

**How to apply:** Garder Organisation comme source du nom et du téléphone, refuser côté API toute création sans employé actif du même tenant et empêcher la qualification multiple d’un même employé. Exiger un chauffeur actif pour les nouveaux véhicules, vérifier la compatibilité chauffeur-véhicule lors d’une course et chercher le véhicule rattaché lors de l’affectation publique.