---
name: Diagnostics GitHub Actions
description: Récupérer les erreurs d’un job GitHub Actions lorsque l’archive de logs n’est pas accessible.
---

L’endpoint de téléchargement des logs d’un job peut renvoyer `403 Must have admin rights to Repository` alors que les métadonnées du job sont lisibles. Dans ce cas, utiliser le `check_run_url` du job puis demander ses annotations; elles peuvent contenir le message d’erreur précis de l’étape.

**Why:** Les permissions nécessaires pour consulter les informations d’un job et télécharger ses logs ne sont pas toujours équivalentes.

**How to apply:** Après un refus sur l’endpoint des logs, vérifier les annotations du check run avant de demander un accès administrateur ou des captures de l’interface GitHub.