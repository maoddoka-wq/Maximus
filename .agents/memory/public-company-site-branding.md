---
name: Identité du site public de l’entreprise
description: Règle d’isolation entre la marque commune du site d’entreprise et les permissions de ses rubriques publiques.
---

Le nom, le slug public, la marque, le logo, les images d’accueil et le domaine appartiennent au site public de l’entreprise. `/site/{slug}` ouvre directement l’accueil de marque, sans écran de choix et sans dépendre d’E-commerce. Le menu du site entreprise présente Accueil, les modules attribués, puis Panier et Se connecter si E-commerce est actif. Le lien E-commerce mène à Boutique. Les fonctionnalités secondaires ne deviennent pas des entrées séparées du menu du site entreprise; la vitrine d’une boutique autonome conserve sa navigation propre.

**Why:** L’utilisateur a précisé que le client doit arriver directement sur l’accueil de marque et voir ensuite les modules, le panier et la connexion, sans sous-fonctionnalités ajoutées dans la barre principale.

**How to apply:** Garder `/site/{slug}` comme page d’entrée; construire son menu depuis les modules publics actifs. Conserver séparément la navigation détaillée des boutiques autonomes.