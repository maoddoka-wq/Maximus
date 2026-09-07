---
name: Tenant isolation
description: Rules for preventing one MAXIMUS company from reading or changing another company's data.
---

Every authenticated business route must derive its company context from the server-side session actor. A client-supplied companyId may only confirm the actor's company; it must never select a different company. MAXIMUS administrators may select an explicit company context, while company users remain bound to their own company. Public storefront routes must be separate from internal management routes.

**Why:** Querying another company identifier is an easy cross-tenant data leak when controllers trust frontend parameters or expose unprotected bootstrap endpoints.

**How to apply:** Put authentication and company-context middleware on each internal module, scope every read/write by the resolved company, and add a cross-company `403` test whenever a new module is introduced.

Les opérations d’administration par secteur doivent vérifier l’inclusion complète du périmètre demandé, et non une simple intersection avec les secteurs autorisés.

**Why:** Une intersection autorisait un manager à soumettre une opération mélangeant un secteur autorisé et un secteur externe, ce qui contournait l’isolation organisationnelle.

**How to apply:** Pour toute création, mise à jour ou révocation délimitée par des secteurs, comparer l’ensemble des secteurs cibles à l’ensemble des secteurs de l’acteur et refuser toute différence.

Pour les listes métier conservées dans l’état applicatif partagé, chaque nouvel
enregistrement doit porter `companyId`; le filtrage et la fusion serveur
s’appuient sur cette propriété.

**Why:** Sans rattachement explicite, une donnée Commerce nouvellement créée
peut être ignorée lors de la fusion d’état ou devenir visible par une autre
entreprise après actualisation.

**How to apply:** Ajouter `companyId` aux types et aux créations de produits,
ventes, paiements, mouvements, activités, fournisseurs et commandes avant
d’étendre un écran métier qui utilise `/api/app-state`.

La résolution d’une session MAXIMUS doit vérifier l’existence et le statut actif
de l’entreprise avant de retourner l’utilisateur ; le middleware seul ne suffit
pas pour les endpoints de session, la connexion et les boutiques publiques.

**Why:** Une session valide techniquement pouvait sinon survivre à l’archivage
d’un tenant sur les chemins qui ne traversent pas le middleware métier.

**How to apply:** Centraliser le contrôle dans la résolution et l’émission des
tokens, révoquer les sessions lors de l’archivage, et appliquer la même règle
aux URLs publiques résolues par slug ou domaine.

Les boutiques par domaine personnalisé doivent résoudre l’entreprise depuis le
Host réel de la requête et non depuis un `X-Forwarded-Host` fourni par le client.

**Why:** Un en-tête de proxy non vérifié permettrait à une requête publique de
choisir le domaine d’une autre entreprise et de franchir la frontière tenant.

**How to apply:** Configurer la confiance proxy au niveau de l’infrastructure
si nécessaire, puis garder les routes publiques par domaine séparées des
routes de gestion authentifiées et tester un Host actif par entreprise.