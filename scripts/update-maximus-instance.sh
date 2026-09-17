#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
LARAVEL_DIR="$WORKSPACE_DIR/artifacts/api-server/laravel"
FRONTEND_DIR="$WORKSPACE_DIR/artifacts/maximus"
ENV_FILE="$LARAVEL_DIR/.env"
BRANCH="${MAXIMUS_UPDATE_BRANCH:-main}"
CENTRAL_URL="${MAXIMUS_CENTRAL_URL:-https://maximus-erp.onrender.com}"
SKIP_BUILD=0
SKIP_COMPOSER=0
SKIP_HEALTHCHECK=0

usage() {
    cat <<'EOF'
Usage: scripts/update-maximus-instance.sh [options]

Met à jour une installation MAXIMUS existante depuis GitHub.
Les fichiers .env, vendor et storage restent locaux et ne sont jamais remplacés.

Options:
  --workspace-dir PATH     Racine du workspace MAXIMUS
  --branch NAME            Branche Git à suivre (défaut: main)
  --central-url URL        URL de MAXIMUS principal
  --skip-composer          Ne pas exécuter composer install
  --skip-build             Ne pas reconstruire le frontend
  --skip-healthcheck       Ne pas lancer la sonde locale
  -h, --help               Afficher cette aide
EOF
}

fail() {
    printf 'Mise à jour MAXIMUS interrompue : %s\n' "$1" >&2
    exit 1
}

log() {
    printf '\n==> %s\n' "$1"
}

command_required() {
    command -v "$1" >/dev/null 2>&1 || fail "Commande requise absente : $1"
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
        local line
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
        --branch)
            [[ "$#" -ge 2 ]] || fail "--branch attend un nom."
            BRANCH="$2"
            shift 2
            ;;
        --central-url)
            [[ "$#" -ge 2 ]] || fail "--central-url attend une URL."
            CENTRAL_URL="$2"
            shift 2
            ;;
        --skip-composer) SKIP_COMPOSER=1; shift ;;
        --skip-build) SKIP_BUILD=1; shift ;;
        --skip-healthcheck) SKIP_HEALTHCHECK=1; shift ;;
        -h|--help) usage; exit 0 ;;
        *) fail "Option inconnue : $1" ;;
    esac
done

[[ -d "$LARAVEL_DIR" ]] || fail "Dossier Laravel introuvable : $LARAVEL_DIR"
[[ -d "$FRONTEND_DIR" ]] || fail "Dossier frontend introuvable : $FRONTEND_DIR"
[[ -f "$ENV_FILE" ]] || fail "Cette installation n’est pas initialisée : .env introuvable."
command_required git
command_required curl
command_required php
if [[ "$SKIP_COMPOSER" -eq 0 ]]; then
    command_required composer
fi
if [[ "$SKIP_BUILD" -eq 0 ]]; then
    command_required corepack
fi

git -C "$WORKSPACE_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1 \
    || fail "Le workspace local doit être un clone Git. Pour une première installation, utilisez git clone."
current_branch="$(git -C "$WORKSPACE_DIR" branch --show-current)"
[[ "$current_branch" == "$BRANCH" ]] \
    || fail "La branche locale est « ${current_branch:-detached} », la branche attendue est « $BRANCH »."
[[ -z "$(git -C "$WORKSPACE_DIR" status --porcelain --untracked-files=all)" ]] \
    || fail "Le workspace contient des changements locaux. Sauvegardez-les ou annulez-les avant la mise à jour."

log "Vérification de la version GitHub et de la version Render"
git -C "$WORKSPACE_DIR" fetch origin "$BRANCH" --prune
target_version="$(git -C "$WORKSPACE_DIR" rev-parse "origin/$BRANCH")"
remote_payload="$(curl --fail --silent --show-error --max-time 20 "${CENTRAL_URL%/}/api/healthz")" \
    || fail "MAXIMUS principal est inaccessible : ${CENTRAL_URL%/}"
remote_version="$(printf '%s' "$remote_payload" | php -r '
    $payload = json_decode(stream_get_contents(STDIN), true);
    $version = is_array($payload) ? trim((string) ($payload["applicationVersion"] ?? "")) : "";
    if ($version === "") {
        exit(1);
    }
    printf("%s", $version);
')"
[[ "$remote_version" != "unknown" && -n "$remote_version" ]] \
    || fail "Render ne publie pas applicationVersion. La mise à jour est bloquée."
[[ "$target_version" == "$remote_version" ]] \
    || fail "GitHub ($target_version) et Render ($remote_version) ne servent pas le même commit."

if ! git -C "$WORKSPACE_DIR" merge-base --is-ancestor HEAD "$target_version"; then
    fail "L’historique local diverge de GitHub. La mise à jour automatique refuse d’écraser cette copie."
fi

if [[ "$(git -C "$WORKSPACE_DIR" rev-parse HEAD)" != "$target_version" ]]; then
    log "Mise à jour du code depuis GitHub"
    git -C "$WORKSPACE_DIR" merge --ff-only "$target_version"
else
    printf '%s\n' "Le code local est déjà sur le commit Render."
fi

printf '%s\n' "$target_version" > "$LARAVEL_DIR/MAXIMUS_BUILD_VERSION"
set_env_value MAXIMUS_EXPECTED_APPLICATION_VERSION "$target_version"

if [[ "$SKIP_COMPOSER" -eq 0 ]]; then
    log "Mise à jour des dépendances Laravel"
    (cd "$LARAVEL_DIR" && composer install --no-dev --no-interaction --no-progress --prefer-dist --optimize-autoloader)
fi

if [[ "$SKIP_BUILD" -eq 0 ]]; then
    log "Construction du frontend MAXIMUS"
    (cd "$WORKSPACE_DIR" && corepack pnpm install --frozen-lockfile)
    (cd "$WORKSPACE_DIR" && PORT=10000 BASE_PATH=/ NODE_ENV=production corepack pnpm --filter @workspace/maximus run build)
    cp -R "$FRONTEND_DIR/dist/public/." "$LARAVEL_DIR/public/"
fi

log "Migration et synchronisation de l’entreprise"
(cd "$LARAVEL_DIR" && php artisan config:clear --no-interaction)
(cd "$LARAVEL_DIR" && php artisan migrate --force --no-interaction)
(cd "$LARAVEL_DIR" && php artisan maximus:install-company --no-interaction)

if [[ "$SKIP_HEALTHCHECK" -eq 0 ]]; then
    log "Vérification locale"
    health_port="$((18080 + RANDOM % 1000))"
    health_log="$(mktemp)"
    (
        cd "$LARAVEL_DIR"
        php -S "127.0.0.1:${health_port}" server.php
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

printf '\nMise à jour MAXIMUS terminée.\n'
printf 'Version locale : %s\n' "$target_version"