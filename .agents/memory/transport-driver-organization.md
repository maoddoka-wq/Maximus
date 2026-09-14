---
name: Qualification des chauffeurs depuis Organisation
description: Source de vérité pour l’identité des chauffeurs et leur qualification Transport.
---

Un chauffeur Taxi doit toujours correspondre à un compte employé actif créé dans Organisation. Transport ne crée pas une identité autonome : il sélectionne l’employé et ajoute uniquement les informations propres à la conduite, comme le permis et le statut.

**Why:** Le GPS, les permissions et la responsabilité opérationnelle dépendent du compte employé ; une fiche chauffeur indépendante pouvait être impossible à localiser ou à rattacher à une personne réelle.

**How to apply:** Garder Organisation comme source du nom et du téléphone, refuser côté API toute création sans employé actif du même tenant et empêcher la qualification multiple d’un même employé.