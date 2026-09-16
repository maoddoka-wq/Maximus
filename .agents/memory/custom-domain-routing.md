---
name: Routage domaine boutique
description: Les domaines personnalisés doivent ouvrir la vitrine sans passer par l’authentification MAXIMUS.
---

Sur un hôte qui n’est ni le domaine principal MAXIMUS ni un domaine de prévisualisation, la route `/` doit être traitée comme une boutique publique avant tout rendu de la connexion MAXIMUS. La route `/connexion` est l’exception explicite : elle peut résoudre l’identité visuelle de l’entreprise liée au domaine vérifié uniquement si l’administration MAXIMUS a activé cette option, puis authentifier uniquement un compte de cette entreprise. Sinon, la connexion générale reste disponible. La détection de la vitrine peut ensuite charger ses données de façon asynchrone.

**Why:** Une détection uniquement dans un effet React commence avec l’état de connexion par défaut et provoque un flash visible de l’écran MAXIMUS sur les domaines de boutiques.

**How to apply:** Identifier l’hôte personnalisé de manière synchrone au premier rendu, court-circuiter la connexion sur `/` mais pas sur `/connexion`, puis laisser la page boutique gérer son chargement et son erreur de domaine. Côté serveur, résoudre le domaine vérifié, vérifier le drapeau d’activation de l’entreprise et contrôler le même `company_id` lors du login.