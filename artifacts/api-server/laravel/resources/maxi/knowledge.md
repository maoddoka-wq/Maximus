# Connaissances locales MAXIMUS

Cette documentation est une source de règles validées, pas un modèle neuronal entraîné.
Le moteur consulte également le catalogue et les métadonnées administratives actuelles.
Les questions des utilisateurs ne modifient pas ces règles.

## MAXI autonome et limites
MAXI fonctionne localement, sans Anthropic, OpenAI, service d’IA externe ni serveur d’inférence.
Sur le forfait 512 Mo, il utilise une recherche documentaire et des règles explicites, pas un modèle génératif.
Il est réservé à l’administration principale MAXIMUS.
Il peut préparer six créations : module, pack, fonctionnalité, secteur, plan entreprise et unité d’organisation.
Chaque modification nécessite un aperçu et une confirmation distincte.
Les modifications de configurations existantes, suppressions, génération de code, paiements et publications automatiques ne sont pas pris en charge.
Une demande incomplète doit être précisée : MAXI ne doit pas inventer des fonctionnalités, des autorisations ou des données.

## Catalogue : modules, fonctionnalités, packs et secteurs
Un module est une capacité métier qui contient des fonctionnalités et ses propres packs.
Un pack sélectionne des fonctionnalités du module ; un secteur compose des modules et des packs existants.
Le catalogue publié est distinct du brouillon de configuration.
Créer un module ou un pack via MAXI ne le publie pas et ne l’active pas dans une entreprise.
Il faut valider et publier explicitement le catalogue depuis l’administration.
Les sélections de packs, les fonctionnalités et les dépendances doivent exister et être compatibles avant confirmation.

## Organisation, employés, rôles et permissions
Construire d’abord la hiérarchie d’organisation, configurer les rôles, puis créer les employés et désigner les managers.
Un manager définit les droits des employés de ses unités autorisées, sans accéder aux autres unités.
Un employé est limité à son propre dossier ; l’administrateur entreprise peut accéder aux employés de son entreprise.
La session serveur détermine l’entreprise : un companyId envoyé par le navigateur ne peut pas élargir l’accès.
Les modifications de rôles doivent synchroniser les permissions des comptes employés concernés.
Les identifiants canoniques des fonctionnalités doivent être utilisés pour les menus et les autorisations.

## Abonnements, activation des modules et contrôle des paiements
L’accès aux modules, l’état de l’abonnement et l’autorisation d’encaisser des paiements sont des contrôles différents.
L’accès courant repose sur les autorisations enregistrées, pas uniquement sur la demande d’inscription initiale.
L’autorisation de paiement est contrôlée séparément par entreprise.
Un checkout DiamanoPay ponctuel ne constitue pas un renouvellement automatique : celui-ci exige un mandat réutilisable documenté.
MAXI ne lance aucun encaissement, retrait ou activation d’entreprise.

## E-commerce : commandes et produits physiques ou numériques
Les commandes, paniers, favoris et adresses des clients sont isolés par client et entreprise.
Les images produits sont des fichiers téléversés liés à l’entreprise, pas une nouvelle URL externe saisie.
Pour un produit numérique : créer en brouillon, téléverser le fichier, puis publier.
Un produit numérique a une quantité de un ; le téléchargement est disponible seulement après paiement confirmé.
La devise de la vente doit être enregistrée au checkout. Une ancienne vente sans devise reste inconnue.
Une vente comptoir doit garder la même clé d’idempotence lors de la relance du même panier.

## Portefeuille vendeur et commissions e-commerce
La répartition d’une vente est de 3 % pour DiamanoPay, 2 % pour MAXIMUS et 95 % pour le vendeur.
Le solde est confirmé après paiement valide.
Il devient retirable après livraison ou après sept jours sans litige, conformément aux règles du portefeuille.
Les registres de règlement doivent être idempotents : réconcilier une vente payée ne doit pas créer un double crédit.
MAXI peut expliquer ces règles, mais il ne verse et ne retire aucun fonds.

## Gestion de stock et frontière avec Commerce
Le stock des ventes comptoir e-commerce reste distinct des entrepôts de Gestion de stock tant qu’aucune correspondance explicite n’existe.
Un accès à un module ne vaut pas automatiquement droit de modifier toutes ses fonctionnalités.
Les références et commentaires facultatifs vides doivent être normalisés avant insertion.
Ne pas inventer une synchronisation entre stocks qui n’a pas été configurée.

## Transport Taxi, chauffeurs et GPS
Le cycle Taxi du module Transport est distinct des locations automobiles e-commerce.
Créer l’employé dans Organisation, puis compléter ses données Taxi dans Transport.
Le rapprochement d’une demande sélectionne côté serveur un chauffeur actif, libre et géolocalisé récemment.
Dans l’application Chauffeur, le GPS est au premier plan et la disponibilité est mise en pause à l’arrière-plan.
Les cartes Taxi client et chauffeur utilisent OpenStreetMap sans clé.
Les liens de suivi et d’annulation sont limités à la course et protégés par des jetons distincts.

## Locations automobiles, disponibilité et livraison
Une réservation automobile est confirmée après un paiement valide avant expiration et sans chevauchement actif.
Le cycle location est distinct de la vente et des demandes de livraison.
Les zones de livraison actives sont limitées à l’entreprise ; leur identité et leur tarif sont conservés dans la demande.
Un devis de trajet ne doit jamais utiliser une distance inventée en cas d’échec du routage.

## Immobilier : patrimoine, biens et annonces
Le bien immobilier interne et l’annonce commerciale ont des cycles, des autorisations et des données distincts.
Les galeries peuvent contenir des photos et des vidéos ; le type MIME permet de les distinguer.
Créer ou modifier un bien ne doit pas publier implicitement une annonce.

## Présences, QR code et pointage
Le gérant affiche le QR code du jour.
Chaque employé scanne avec son propre compte pour enregistrer son arrivée puis sa sortie.
Les présences et leur historique sont persistés dans PostgreSQL.
Une permission détaillée Présences ne doit pas être remplacée par le droit d’une autre fonctionnalité.

## Paie : fonds et comptes
Créditer les fonds seulement après un webhook signé et validé.
Les comptes financiers doivent être chiffrés et les fonds réservés avant un virement.
Les packs Paie doivent matérialiser leurs permissions lors du provisionnement.
MAXI ne calcule pas un paiement fictif et ne déclenche jamais un virement.

## Boutiques publiques, inscription et personnalisation
Les noms des boutiques peuvent être identiques, mais leurs slugs publics sont globalement uniques.
Le site, l’accueil et la bannière d’une boutique sont des capacités contrôlées séparément.
Masquer une bannière conserve ses images.
Les couleurs de la boutique et du Transport public restent séparées.
L’inscription publique consulte le catalogue publié, jamais son brouillon.
Le réglage global d’inscription masque les parcours publics, sans empêcher une création manuelle par MAXIMUS.

## Installations dédiées et fonctionnement local
L’installation centrale est le mode par défaut.
Une installation dédiée est bornée par une entreprise configurée côté serveur et ne crée pas d’administration MAXIMUS globale.
Sous Windows, les scripts doivent résoudre leurs chemins depuis le dossier réel du script.
Les outils de build comme Vite restent nécessaires même dans un environnement configuré en production.
L’instance Render actuelle est conservée ; MAXI ne change ni le forfait, ni la facturation, ni l’hébergement.

## Préparer un plan local explicite
Indiquer le nom et les champs demandés, avec des libellés suivis de deux-points.
Séparer les étapes par une nouvelle ligne ou par « puis ».
Exemple module : Créer le module « Atelier » description : Gestion de l’atelier fonctionnalités : Interventions, Planning.
Exemple pack : Créer le pack « Essentiel » pour le module « Atelier » description : Accès de base fonctionnalités : Interventions.
Exemple fonctionnalité : Créer la fonctionnalité « Export » dans le module « Atelier » description : Exporter les interventions.
Exemple secteur : Créer le secteur « Réparation » modules : Atelier.
Exemple entreprise : Préparer l’entreprise « Garage » secteur : Réparation modules : Atelier besoins : Gérer les interventions.
Exemple unité : Créer l’unité « Équipe atelier » dans l’entreprise « Entreprise existante » code : ATL modules : Atelier.
Une unité exige une entreprise existante ; un plan entreprise ne crée ni n’active automatiquement cette entreprise.