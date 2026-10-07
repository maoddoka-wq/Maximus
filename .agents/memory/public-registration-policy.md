---
name: Inscription publique
description: Règle produit pour l’ouverture et la fermeture des demandes publiques d’entreprise.
---

Le réglage d’inscription automatique contrôle uniquement l’onboarding intelligent et ses brouillons. Le formulaire manuel public et sa création de demande restent disponibles ; la création d’une entreprise par l’administration MAXIMUS reste indépendante de ce réglage.

La valeur globale vient du catalogue d’inscription. `InstallationProfile.registrationEnabled` est une restriction supplémentaire propre au point d’entrée; ne jamais la recopier dans l’état du réglage global. Le profil central indique qu’il autorise l’inscription en général et pourrait réactiver le bouton IA après la réponse `false` du catalogue.

**Why:** Fermer le parcours automatique ne doit pas supprimer le parcours manuel, et la configuration d’un point d’entrée ne doit pas écraser le réglage global.

**How to apply:** Combiner la valeur explicite du catalogue avec la restriction d’installation sans leur faire partager une source d’état. Si le catalogue est encore inconnu ou indisponible, masquer le parcours IA; conserver le formulaire manuel et ne pas réinitialiser les entreprises existantes.

Quand une inscription publique depuis l’accueil choisit un secteur, envoyer la demande avec la configuration publiée de ce secteur, sans afficher l’étape de choix manuel des modules et fonctionnalités; présenter ensuite l’état « Votre demande est en attente ». Sans secteur, conserver la configuration manuelle existante.

**Why:** L’utilisateur veut que MAXIMUS examine les demandes sectorielles avant que le client configure les modules et fonctionnalités.

**How to apply:** Limiter ce raccourci au formulaire public d’inscription; garder la création depuis l’administration séparée et conserver les modules, packs, fonctionnalités et permissions définis par le secteur publié dans la demande.