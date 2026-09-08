#!/bin/sh

set -eu

required_variables="APP_KEY ADMIN_USER ADMIN_PASSWORD DATABASE_URL DIAMANOPAY_CLIENT_ID DIAMANOPAY_CLIENT_SECRET DIAMANOPAY_WEBHOOK_SECRET"

for variable in $required_variables; do
    eval "value=\${$variable:-}"
    if [ -z "$value" ]; then
        echo "Render startup error: $variable is required." >&2
        exit 1
    fi
done

attempt=1
max_attempts=30

while ! php artisan migrate --force --no-interaction; do
    if [ "$attempt" -ge "$max_attempts" ]; then
        echo "Render startup error: PostgreSQL was not ready after ${max_attempts} attempts." >&2
        exit 1
    fi

    echo "Waiting for PostgreSQL (${attempt}/${max_attempts})..." >&2
    attempt=$((attempt + 1))
    sleep 2
done

php artisan maximus:provision-admin --no-interaction

exec php -S "0.0.0.0:${PORT:-10000}" -t public server.php