---
name: Laravel runtime configuration
description: Runtime constraint for keeping the Laravel API connected to the shared PostgreSQL database.
---

The Laravel API must be started with the PostgreSQL connection in the same PHP process that handles HTTP requests. In this environment, `php artisan serve` can start its child HTTP process with the default SQLite configuration even when the parent command has `DB_CONNECTION=pgsql`; the PHP built-in server with Laravel's router preserves the intended environment.

**Why:** A CLI Artisan command and the initial health checks can appear healthy while HTTP authentication silently reads an empty SQLite database.

**How to apply:** Keep the API workflow's startup sequence as an idempotent provisioning command followed by `DB_CONNECTION=pgsql php -S 0.0.0.0:${PORT} server.php`; do not switch back to `php artisan serve` without revalidating HTTP database access.

The current acceptance target is the MAXIMUS demo environment. Production should reuse the same Laravel code path only after the demo workflows and role permissions are validated.

**Why:** The user wants to prove the complete product behavior in demo before changing production.

**How to apply:** Continue functional validation in demo for now; defer production-specific configuration and deployment changes until demo acceptance.

Le workflow de démonstration provisionne les comptes avant de démarrer le serveur et n’applique pas automatiquement les migrations. Les évolutions de schéma nécessaires au provisionnement doivent donc être idempotentes dans cette commande, en plus de leur migration officielle.

**Why:** Une nouvelle colonne de permissions a bloqué le démarrage alors que les tests, qui exécutent les migrations, passaient correctement.

**How to apply:** Pour toute donnée requise par `ensureAuthUsers` ou un autre provisionneur de démarrage, vérifier/créer la colonne de façon idempotente avant le premier `updateOrCreate`; conserver la migration pour les environnements normaux.

Les migrations lancées depuis le shell doivent elles aussi recevoir explicitement `DB_CONNECTION=pgsql`; sinon elles peuvent être appliquées à la base SQLite locale alors que le serveur HTTP utilise PostgreSQL.

**Why:** Une migration considérée comme terminée en CLI a laissé les tables absentes de la base réellement interrogée par l’API.

**How to apply:** Vérifier `DB_CONNECTION=pgsql php artisan migrate:status` avant toute validation d’une nouvelle route Laravel.