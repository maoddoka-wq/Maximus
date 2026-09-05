---
name: Laravel runtime configuration
description: Runtime constraint for keeping the Laravel API connected to the shared PostgreSQL database.
---

The Laravel API must be started with the PostgreSQL connection in the same PHP process that handles HTTP requests. In this environment, `php artisan serve` can start its child HTTP process with the default SQLite configuration even when the parent command has `DB_CONNECTION=pgsql`; the PHP built-in server with Laravel's router preserves the intended environment.

**Why:** A CLI Artisan command and the initial health checks can appear healthy while HTTP authentication silently reads an empty SQLite database.

**How to apply:** Keep the API workflow's startup sequence as an idempotent provisioning command followed by `DB_CONNECTION=pgsql php -S 0.0.0.0:${PORT} server.php`; do not switch back to `php artisan serve` without revalidating HTTP database access.