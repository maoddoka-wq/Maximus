---
name: Identité du site public de l’entreprise
description: Règle d’isolation entre la marque commune du site d’entreprise et les permissions de ses rubriques publiques.
---

Le nom, le slug public, la marque, le logo, les images d’accueil et le domaine appartiennent au site public de l’entreprise. `/site/{slug}` ouvre directement l’accueil de marque, sans écran de choix et sans dépendre d’E-commerce. Le menu du site entreprise présente Accueil, les modules attribués, puis Panier et Se connecter si E-commerce est actif. Le lien E-commerce mène à Boutique. Les fonctionnalités secondaires ne deviennent pas des entrées séparées du menu du site entreprise; la vitrine d’une boutique autonome conserve sa navigation propre.

Le slug du site de marque peut différer du slug de la boutique publiée. Pour les appels API de modules, utiliser le `storeSlug` public résolu côté serveur tout en gardant les liens navigateur sous le chemin du site de marque. Sur un domaine personnalisé, conserver les appels résolus par hôte plutôt que de les convertir en appels par slug.

**Why:** Les endpoints de boutique résolvent leur tenant depuis le slug de magasin, alors que les URLs de marque utilisent un slug public indépendant; la navigation client doit rester sous l’identité de marque.

**How to apply:** Garder `/site/{slug}` comme page d’entrée; construire son menu depuis les modules publics actifs. Utiliser le slug de magasin seulement pour les appels API et conserver la navigation détaillée des boutiques autonomes.

Le PWA de la vitrine est une identité distincte du PWA de la boutique. Ses pages E-commerce intégrées restent sous le périmètre du site public; une boutique installée de façon autonome conserve son propre périmètre. Pour un domaine personnalisé, les appels de bootstrap et de manifeste restent résolus par l’hôte.

**Why:** Le slug de marque peut différer du slug boutique. Installer ou lancer la vitrine avec le manifeste de la boutique ferait sortir l’utilisateur de l’identité et du périmètre de navigation du site.

**How to apply:** Utiliser le slug public pour l’identité PWA de marque, garder le storeSlug uniquement pour les API de boutique et ne pas remplacer le manifeste de la vitrine sur ses pages E-commerce intégrées.