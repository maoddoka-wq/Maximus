#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
LARAVEL_DIR="$WORKSPACE_DIR/artifacts/api-server/laravel"
FRONTEND_DIR="$WORKSPACE_DIR/artifacts/maximus"
ENV_FILE="$LARAVEL_DIR/.env"
NON_INTERACTIVE=0
SKIP_BUILD=0
SKIP_COMPOSER=0
SKIP_HEALTHCHECK=0
BOOTSTRAP_FILE=""

usage() {
    cat <<'EOF'
Usage: scripts/install-maximus-instance.sh [options]

Initialise une instance MAXIMUS dédiée ou locale dans le workspace courant.
Les valeurs peuvent être fournies par variables d’environnement ou saisies
interactivement. Les secrets ne sont jamais affichés.

Options:
  --workspace-dir PATH     Racine du workspace MAXIMUS
  --env-file PATH          Fichier Laravel .env à mettre à jour
  --bootstrap-file PATH    Fichier JSON d’enrôlement généré par MAXIMUS principal
  --non-interactive        Refuse les valeurs manquantes au lieu de demander
  --skip-composer          Ne pas exécuter composer install
  --skip-build             Ne pas construire ni copier le frontend
  --skip-healthcheck       Ne pas appeler /api/healthz à la fin
  -h, --help               Afficher cette aide

Variables utiles:
  DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD
  APP_URL, MAXIMUS_ADMIN_USER, MAXIMUS_ADMIN_PASSWORD
EOF
}

fail() {
    printf 'Installation MAXIMUS interrompue : %s\n' "$1" >&2
    exit 1
}

log() {
    printf '\n==> %s\n' "$1"
}

command_required() {
    command -v "$1" >/dev/null 2>&1 || fail "Commande requise absente : $1"
}

env_file_value() {
    local key="$1"
    local line=""
    if [[ -f "$ENV_FILE" ]]; then
        line="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 || true)"
    fi
    if [[ -z "$line" ]]; then
        return 0
    fi

    local value="${line#*=}"
    if [[ "$value" == \"*\" ]]; then
        value="${value:1:${#value}-2}"
        value="${value//\\\"/\"}"
        value="${value//\\\\/\\}"
    fi
    printf '%s' "$value"
}

encode_env_value() {
    local value="$1"
    value="${value//$'\n'/}"
    value="${value//\\/\\\\}"
    value="${value//\"/\\\"}"
    printf '"%s"' "$value"
}

set_env_value() {
    local key="$1"
    local value="$2"
    local encoded
    encoded="$(encode_env_value "$value")"

    local temp_file
    temp_file="$(mktemp "${ENV_FILE}.tmp.XXXXXX")"
    if [[ -f "$ENV_FILE" ]]; then
        local replaced=0
        while IFS= read -r line || [[ -n "$line" ]]; do
            if [[ "$line" == "$key="* ]]; then
                printf '%s=%s\n' "$key" "$encoded" >>"$temp_file"
                replaced=1
            else
                printf '%s\n' "$line" >>"$temp_file"
            fi
        done <"$ENV_FILE"
        if [[ "$replaced" -eq 0 ]]; then
            printf '%s=%s\n' "$key" "$encoded" >>"$temp_file"
        fi
    else
        printf '%s=%s\n' "$key" "$encoded" >>"$temp_file"
    fi
    mv "$temp_file" "$ENV_FILE"
}

existing_or_exported() {
    local key="$1"
    local value="${!key-}"
    if [[ -z "$value" ]]; then
        value="$(env_file_value "$key")"
    fi
    printf '%s' "$value"
}

ask_value() {
    local key="$1"
    local label="$2"
    local default="${3-}"
    local current
    current="$(existing_or_exported "$key")"
    if [[ -n "$current" ]]; then
        REPLY="$current"
        return
    fi
    if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
        fail "$key est requis en mode non interactif."
    fi
    if [[ -n "$default" ]]; then
        read -r -p "$label [$default] : " current
        current="${current:-$default}"
    else
        read -r -p "$label : " current
    fi
    [[ -n "$current" ]] || fail "$key ne peut pas être vide."
    REPLY="$current"
}

ask_secret() {
    local key="$1"
    local label="$2"
    local current
    current="$(existing_or_exported "$key")"
    if [[ -n "$current" ]]; then
        REPLY="$current"
        return
    fi
    if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
        fail "$key est requis en mode non interactif."
    fi
    read -r -s -p "$label : " current
    printf '\n'
    [[ -n "$current" ]] || fail "$key ne peut pas être vide."
    REPLY="$current"
}

ask_optional() {
    local key="$1"
    local label="$2"
    local default="${3-}"
    local current
    current="$(existing_or_exported "$key")"
    if [[ -n "$current" ]]; then
        REPLY="$current"
        return
    fi
    if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
        REPLY="$default"
        return
    fi
    read -r -p "$label [$default] : " current
    REPLY="${current:-$default}"
}

validate_email() {
    local value="$1"
    php -r 'exit(filter_var($argv[1], FILTER_VALIDATE_EMAIL) ? 0 : 1);' "$value"
}

bootstrap_value() {
    local file="$1"
    local path="$2"
    php -r '
        $value = json_decode(file_get_contents($argv[1]), true);
        foreach (explode(".", $argv[2]) as $part) {
            if (!is_array($value) || !array_key_exists($part, $value)) exit(1);
            $value = $value[$part];
        }
        if (is_scalar($value)) printf("%s", (string) $value);
    ' "$file" "$path"
}

while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --workspace-dir)
            [[ "$#" -ge 2 ]] || fail "--workspace-dir attend un chemin."
            WORKSPACE_DIR="$(cd -- "$2" && pwd)"
            LARAVEL_DIR="$WORKSPACE_DIR/artifacts/api-server/laravel"
            FRONTEND_DIR="$WORKSPACE_DIR/artifacts/maximus"
            ENV_FILE="$LARAVEL_DIR/.env"
            shift 2
            ;;
        --env-file)
            [[ "$#" -ge 2 ]] || fail "--env-file attend un chemin."
            ENV_FILE="$2"
            shift 2
            ;;
        --bootstrap-file)
            [[ "$#" -ge 2 ]] || fail "--bootstrap-file attend un chemin."
            BOOTSTRAP_FILE="$2"
            shift 2
            ;;
        --non-interactive) NON_INTERACTIVE=1; shift ;;
        --skip-composer) SKIP_COMPOSER=1; shift ;;
        --skip-build) SKIP_BUILD=1; shift ;;
        --skip-healthcheck) SKIP_HEALTHCHECK=1; shift ;;
        -h|--help) usage; exit 0 ;;
        *) fail "Option inconnue : $1" ;;
    esac
done

[[ -d "$LARAVEL_DIR" ]] || fail "Dossier Laravel introuvable : $LARAVEL_DIR"
[[ -d "$FRONTEND_DIR" ]] || fail "Dossier frontend introuvable : $FRONTEND_DIR"
command_required php
if [[ "$SKIP_COMPOSER" -eq 0 ]]; then
    command_required composer
fi
if [[ "$SKIP_HEALTHCHECK" -eq 0 ]]; then
    command_required curl
fi

if [[ ! -f "$ENV_FILE" ]]; then
    mkdir -p "$(dirname -- "$ENV_FILE")"
    cp "$LARAVEL_DIR/.env.example" "$ENV_FILE"
fi
chmod 600 "$ENV_FILE"
umask 077

log "Collecte de la configuration de l’entreprise"
if [[ -z "$BOOTSTRAP_FILE" ]]; then
    BOOTSTRAP_FILE="$(existing_or_exported MAXIMUS_INSTALLATION_BOOTSTRAP)"
fi
[[ -f "$BOOTSTRAP_FILE" ]] || fail "Le fichier JSON d’enrôlement MAXIMUS est requis (--bootstrap-file)."
bootstrap_mode="$(bootstrap_value "$BOOTSTRAP_FILE" mode)" || fail "Le manifeste d’enrôlement est invalide."
bootstrap_url="$(bootstrap_value "$BOOTSTRAP_FILE" centralUrl)" || fail "Le manifeste ne contient pas centralUrl."
bootstrap_token="$(bootstrap_value "$BOOTSTRAP_FILE" token)" || fail "Le manifeste ne contient pas le jeton."
bootstrap_company_id="$(bootstrap_value "$BOOTSTRAP_FILE" companyId)" || fail "Le manifeste ne contient pas companyId."
bootstrap_installation_id="$(bootstrap_value "$BOOTSTRAP_FILE" installationId)" || fail "Le manifeste ne contient pas installationId."
bootstrap_application_version="$(bootstrap_value "$BOOTSTRAP_FILE" applicationVersion)" || fail "Le manifeste est ancien et ne contient pas applicationVersion. Générez un nouveau bootstrap depuis MAXIMUS principal."
bootstrap_sync_protocol_version="$(bootstrap_value "$BOOTSTRAP_FILE" syncProtocolVersion)" || fail "Le manifeste est ancien et ne contient pas syncProtocolVersion. Générez un nouveau bootstrap depuis MAXIMUS principal."
if command -v git >/dev/null 2>&1 && git -C "$WORKSPACE_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    local_git_version="$(git -C "$WORKSPACE_DIR" rev-parse HEAD)"
    [[ "$local_git_version" == "$bootstrap_application_version" ]] \
        || fail "Le commit local ($local_git_version) ne correspond pas à la version du bootstrap ($bootstrap_application_version). Clonez le commit déployé par MAXIMUS principal."
    printf '%s\n' "$local_git_version" > "$LARAVEL_DIR/MAXIMUS_BUILD_VERSION"
fi
case "$bootstrap_mode" in
    dedicated|on_premise) ;;
    *) fail "Le mode du manifeste doit être dedicated ou on_premise." ;;
esac
[[ "$bootstrap_company_id" =~ ^[A-Za-z0-9_-]+$ ]] || fail "L’identifiant d’entreprise du manifeste est invalide."
set_env_value MAXIMUS_DEPLOYMENT_MODE "$bootstrap_mode"
set_env_value MAXIMUS_CENTRAL_URL "$bootstrap_url"
set_env_value MAXIMUS_INSTALLATION_TOKEN "$bootstrap_token"
set_env_value MAXIMUS_INSTALLATION_ID "$bootstrap_installation_id"
set_env_value MAXIMUS_INSTALLATION_COMPANY_ID "$bootstrap_company_id"
set_env_value MAXIMUS_INSTALLATION_BOOTSTRAP "$BOOTSTRAP_FILE"
set_env_value MAXIMUS_EXPECTED_APPLICATION_VERSION "$bootstrap_application_version"

log "Collecte de la configuration de PostgreSQL"
set_env_value DB_CONNECTION "pgsql"
ask_value DB_HOST "Hôte PostgreSQL" "127.0.0.1"
set_env_value DB_HOST "$REPLY"
ask_value DB_PORT "Port PostgreSQL" "5432"
set_env_value DB_PORT "$REPLY"
ask_value DB_DATABASE "Base PostgreSQL" "maximus"
set_env_value DB_DATABASE "$REPLY"
ask_value DB_USERNAME "Utilisateur PostgreSQL" "maximus"
set_env_value DB_USERNAME "$REPLY"
ask_secret DB_PASSWORD "Mot de passe PostgreSQL"
set_env_value DB_PASSWORD "$REPLY"

log "Configuration de l’administrateur entreprise"
admin_user="$(existing_or_exported MAXIMUS_ADMIN_USER)"
if [[ -z "$admin_user" ]]; then
    admin_user="$(existing_or_exported ADMIN_USER)"
fi
if [[ -n "$admin_user" ]]; then
    set_env_value MAXIMUS_ADMIN_USER "$admin_user"
else
    ask_value MAXIMUS_ADMIN_USER "Email de l’administrateur entreprise"
    admin_user="$REPLY"
    set_env_value MAXIMUS_ADMIN_USER "$REPLY"
fi
validate_email "$admin_user" || fail "MAXIMUS_ADMIN_USER doit être une adresse valide."

admin_password="$(existing_or_exported MAXIMUS_ADMIN_PASSWORD)"
if [[ -z "$admin_password" ]]; then
    admin_password="$(existing_or_exported ADMIN_PASSWORD)"
fi
if [[ -n "$admin_password" ]]; then
    set_env_value MAXIMUS_ADMIN_PASSWORD "$admin_password"
else
    ask_secret MAXIMUS_ADMIN_PASSWORD "Mot de passe initial de l’administrateur"
    [[ "${#REPLY}" -ge 8 ]] || fail "Le mot de passe initial doit contenir au moins 8 caractères."
    set_env_value MAXIMUS_ADMIN_PASSWORD "$REPLY"
fi

ask_value APP_URL "URL publique de l’installation" "http://localhost:8080"
set_env_value APP_URL "$REPLY"
if [[ "$REPLY" == https://* ]]; then
    set_env_value SESSION_SECURE_COOKIE "true"
else
    set_env_value SESSION_SECURE_COOKIE "false"
fi
set_env_value APP_ENV "production"
set_env_value APP_DEBUG "false"
set_env_value SESSION_DRIVER "database"
set_env_value CACHE_STORE "database"
set_env_value QUEUE_CONNECTION "database"
set_env_value DIGITAL_STORAGE_PATH "$LARAVEL_DIR/storage/app/digital-products"

log "Installation des dépendances Laravel"
if [[ "$SKIP_COMPOSER" -eq 0 ]]; then
    (cd "$LARAVEL_DIR" && composer install --no-dev --no-interaction --no-progress --prefer-dist --optimize-autoloader)
else
    printf '%s\n' "Composer ignoré (--skip-composer)."
fi

if [[ -z "$(existing_or_exported APP_KEY)" ]]; then
    (cd "$LARAVEL_DIR" && php artisan key:generate --force --no-interaction)
fi

mkdir -p "$LARAVEL_DIR/storage/app/digital-products" "$LARAVEL_DIR/storage/framework/cache"
mkdir -p "$LARAVEL_DIR/storage/framework/sessions" "$LARAVEL_DIR/storage/framework/views"
mkdir -p "$LARAVEL_DIR/bootstrap/cache"
chmod -R ug+rwX "$LARAVEL_DIR/storage" "$LARAVEL_DIR/bootstrap/cache"

if [[ "$SKIP_BUILD" -eq 0 ]]; then
    log "Construction du frontend MAXIMUS"
    command_required corepack
    (cd "$WORKSPACE_DIR" && corepack pnpm install --frozen-lockfile)
    (cd "$WORKSPACE_DIR" && MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' MSYS2_ENV_CONV_EXCL='BASE_PATH' PORT=10000 BASE_PATH=/ NODE_ENV=production corepack pnpm --filter @workspace/maximus run build)
    cp -R "$FRONTEND_DIR/dist/public/." "$LARAVEL_DIR/public/"
else
    printf '%s\n' "Construction frontend ignorée (--skip-build)."
fi

log "Migration PostgreSQL et initialisation de l’entreprise"
(cd "$LARAVEL_DIR" && php artisan config:clear --no-interaction)
(cd "$LARAVEL_DIR" && php artisan migrate --force --no-interaction)
(cd "$LARAVEL_DIR" && php artisan maximus:install-company --no-interaction)

if [[ "$SKIP_HEALTHCHECK" -eq 0 ]]; then
    log "Vérification de santé"
    if [[ -n "${MAXIMUS_HEALTH_URL:-}" ]]; then
        curl --fail --silent --show-error --max-time 15 "$MAXIMUS_HEALTH_URL" >/dev/null \
            || fail "La sonde de santé est inaccessible : $MAXIMUS_HEALTH_URL"
    else
        health_port="$((18080 + RANDOM % 1000))"
        health_log="$(mktemp)"
        (
            cd "$LARAVEL_DIR/public"
            php -S "127.0.0.1:${health_port}" -t "$LARAVEL_DIR/public" "$LARAVEL_DIR/vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php"
        ) >"$health_log" 2>&1 &
        health_pid=$!
        health_ok=0
        for _ in {1..15}; do
            if curl --fail --silent --max-time 2 \
                "http://127.0.0.1:${health_port}/api/healthz" >/dev/null; then
                health_ok=1
                break
            fi
            sleep 1
        done
        kill "$health_pid" >/dev/null 2>&1 || true
        wait "$health_pid" >/dev/null 2>&1 || true
        if [[ "$health_ok" -ne 1 ]]; then
            cat "$health_log" >&2
            rm -f "$health_log"
            fail "La sonde de santé locale a échoué."
        fi
        rm -f "$health_log"
    fi
    printf '%s\n' "Sonde de santé réussie."
fi

printf '\nInstallation MAXIMUS terminée.\n'
printf 'Mode : installation entreprise isolée\n'
printf 'Fichier de configuration : %s\n' "$ENV_FILE"
printf 'Démarrage Windows local : powershell -File scripts/start-maximus-local.ps1 (depuis la racine du projet).\n'
printf 'Démarrage POSIX local : cd "%s/public" && php -S 127.0.0.1:8080 -t "%s/public" "%s/vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php"\n' "$LARAVEL_DIR" "$LARAVEL_DIR" "$LARAVEL_DIR"