#!/bin/sh

set -eu

required_variables="APP_KEY ADMIN_USER ADMIN_PASSWORD DATABASE_URL APP_URL"

for variable in $required_variables; do
    eval "value=\${$variable:-}"
    if [ -z "$value" ]; then
        echo "Render startup error: $variable is required." >&2
        exit 1
    fi
done

for variable in DIAMANOPAY_CLIENT_ID DIAMANOPAY_CLIENT_SECRET DIAMANOPAY_WEBHOOK_SECRET; do
    eval "value=\${$variable:-}"
    if [ -z "$value" ]; then
        echo "Render startup warning: $variable is not configured; DiamanoPay features remain disabled." >&2
    fi
done

digital_storage_path="${DIGITAL_STORAGE_PATH:-/var/data/digital-products}"
case "$digital_storage_path" in
    /var/data/*) ;;
    *)
        echo "Render startup error: DIGITAL_STORAGE_PATH must use the persistent /var/data disk in production." >&2
        exit 1
        ;;
esac
mkdir -p "$digital_storage_path"
if [ ! -w "$digital_storage_path" ]; then
    echo "Render startup error: digital storage is not writable: $digital_storage_path" >&2
    exit 1
fi

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