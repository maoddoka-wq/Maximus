---
name: Identité du site public de l’entreprise
description: Règles de marque, navigation et installation PWA du site public unique d’une entreprise.
---

Le site public de l’entreprise est l’unique vitrine et possède son nom, son slug public, son logo, ses images d’accueil et son domaine. E-commerce est un module dans ce site, pas un shell ou une PWA distincte. Sa navigation interne peut proposer Produits, Panier et Compte; la navigation de l’entreprise reste Accueil et modules publics. Transport conserve sa route dédiée, mais n’apparaît ni sur l’accueil ni dans le menu du site.

**Why:** Une deuxième coquille de boutique ou une entrée Transport visible crée une vitrine concurrente et détourne l’utilisateur de l’identité de l’entreprise.

**How to apply:** Garder le shell et l’identité du site autour de chaque module public, y compris E-commerce. Ne pas ajouter le panier ou la connexion au menu global; conserver Transport adressable sans le promouvoir sur l’accueil ou le menu.

Le slug public de marque peut différer du slug de boutique. Les URLs navigateur et l’identité PWA utilisent le slug de marque; les appels d’API E-commerce utilisent le storeSlug public résolu côté serveur. Sur un domaine personnalisé, les appels du site et du manifeste restent résolus par hôte.

**Why:** Les slugs de site et de boutique ont des propriétaires et des usages différents; les confondre peut ouvrir le mauvais tenant ou installer le mauvais site.

**How to apply:** Ne jamais déduire le slug de marque depuis le storeSlug. Conserver les liens sous le chemin du site public et garder le contexte d’hôte pour les domaines personnalisés.

La PWA installée depuis le site doit utiliser le nom et le logo publics de l’entreprise ainsi que le périmètre et l’URL de lancement du site. Lors d’un changement de manifeste dans une navigation SPA, invalider toute demande d’installation différée associée à l’ancien manifeste; proposer l’installation seulement après validation du manifeste courant.

**Why:** Le navigateur peut conserver un événement d’installation après un changement de route; le réutiliser installe une identité précédente, par exemple MAXIMUS ou une boutique.

**How to apply:** Vérifier le manifeste du site par slug public et par domaine personnalisé. Garder le bouton Installer visible; sur iOS, expliquer l’ajout à l’écran d’accueil. Après une ancienne installation avec la mauvaise identité, demander de supprimer l’ancienne icône avant de réinstaller le site.