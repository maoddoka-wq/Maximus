---
name: Cache Composer Windows
description: Réparation d’une installation Laravel Windows dont l’archive framework est incomplète malgré un autoload généré.
---

Sur Windows, une installation Composer peut déclarer Laravel installé alors qu’un fichier de `laravel/framework` manque réellement dans `vendor`. `composer dump-autoload` et une réinstallation normale peuvent alors conserver le problème.

**Why:** l’archive Composer locale peut être incomplète ou corrompue ; vérifier directement `file_exists` et `class_exists` permet de distinguer ce cas d’un problème applicatif.

**How to apply:** depuis le dossier Laravel, exécuter `composer clear-cache`, supprimer uniquement `vendor\laravel\framework`, puis relancer `composer install --no-dev --no-scripts ...` avant tout appel à `php artisan`.