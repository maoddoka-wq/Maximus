#!/bin/sh

set -eu

required_variables="APP_KEY DATABASE_URL APP_URL"

for variable in $required_variables; do
    eval "value=\${$variable:-}"
    if [ -z "$value" ]; then
        echo "Render startup error: $variable is required." >&2
        exit 1
    fi
done

deployment_mode="${MAXIMUS_DEPLOYMENT_MODE:-central}"
case "$deployment_mode" in
    central)
        for variable in ADMIN_USER ADMIN_PASSWORD; do
            eval "value=\${$variable:-}"
            if [ -z "$value" ]; then
                echo "Render startup error: $variable is required for the central installation." >&2
                exit 1
            fi
        done
        ;;
    dedicated|on_premise)
        for variable in MAXIMUS_INSTALLATION_COMPANY_ID MAXIMUS_COMPANY_NAME MAXIMUS_COMPANY_EMAIL; do
            eval "value=\${$variable:-}"
            if [ -z "$value" ]; then
                echo "Render startup error: $variable is required for an isolated installation." >&2
                exit 1
            fi
        done

        admin_user="${MAXIMUS_ADMIN_USER:-${ADMIN_USER:-}}"
        admin_password="${MAXIMUS_ADMIN_PASSWORD:-${ADMIN_PASSWORD:-}}"
        if [ -z "$admin_user" ] || [ -z "$admin_password" ]; then
            echo "Render startup error: MAXIMUS_ADMIN_USER/MAXIMUS_ADMIN_PASSWORD or ADMIN_USER/ADMIN_PASSWORD are required for an isolated installation." >&2
            exit 1
        fi
        ;;
    *)
        echo "Render startup error: MAXIMUS_DEPLOYMENT_MODE must be central, dedicated or on_premise." >&2
        exit 1
        ;;
esac

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
# Apache/PHP handles uploaded files as www-data, while this entrypoint runs as
# root. Fix the ownership on every boot so an existing Render disk works too.
chown -R www-data:www-data "$digital_storage_path"
chmod -R ug+rwX "$digital_storage_path"
if ! su -s /bin/sh -c "test -w '$digital_storage_path'" www-data; then
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

if [ "$deployment_mode" = "central" ]; then
    php artisan maximus:provision-admin --no-interaction
else
    php artisan maximus:install-company --no-interaction
fi

exec apache2-foreground