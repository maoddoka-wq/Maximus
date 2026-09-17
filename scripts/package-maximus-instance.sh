#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
CENTRAL_URL="${MAXIMUS_CENTRAL_URL:-https://maximus-erp.onrender.com}"
OUTPUT_PATH="${1:-maximus-instance.zip}"

fail() {
    printf 'Packaging MAXIMUS interrompu : %s\n' "$1" >&2
    exit 1
}

command -v curl >/dev/null 2>&1 || fail "Commande requise absente : curl"
command -v git >/dev/null 2>&1 || fail "Commande requise absente : git"
command -v php >/dev/null 2>&1 || fail "Commande requise absente : php"
command -v tar >/dev/null 2>&1 || fail "Commande requise absente : tar"
command -v zip >/dev/null 2>&1 || fail "Commande requise absente : zip"

git -C "$WORKSPACE_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1 \
    || fail "Le workspace MAXIMUS doit être un dépôt Git."
[[ -z "$(git -C "$WORKSPACE_DIR" status --porcelain)" ]] \
    || fail "Le workspace contient des changements non commités. Committez et poussez d’abord la version à déployer."

local_version="$(git -C "$WORKSPACE_DIR" rev-parse HEAD)"
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
[[ -n "$remote_version" && "$remote_version" != "unknown" ]] \
    || fail "MAXIMUS principal ne publie pas encore applicationVersion. Déployez la version actuelle avant de créer l’archive."
[[ "$remote_version" == "$local_version" ]] \
    || fail "La version locale ($local_version) ne correspond pas à celle servie par Render ($remote_version). Attendez le déploiement ou utilisez le commit réellement en ligne."

case "$OUTPUT_PATH" in
    /*) ;;
    *) OUTPUT_PATH="$WORKSPACE_DIR/$OUTPUT_PATH" ;;
esac

temp_dir="$(mktemp -d)"
cleanup() {
    rm -rf "$temp_dir"
}
trap cleanup EXIT

package_dir="$temp_dir/maximus-$local_version"
mkdir -p "$package_dir"
tar \
    --exclude='./.git' \
    --exclude='./.local' \
    --exclude='./.cache' \
    --exclude='./attached_assets' \
    --exclude='*/node_modules' \
    --exclude='*/vendor' \
    --exclude='*/.env' \
    --exclude='*/.env.backup' \
    --exclude='*/.env.production' \
    --exclude='*/.phpunit.result.cache' \
    --exclude='*/storage/framework' \
    --exclude='*/storage/logs' \
    --exclude='*/storage/app/digital-products' \
    --exclude='*/public/storage' \
    --exclude='*.sqlite' \
    -C "$WORKSPACE_DIR" -cf - . | tar -C "$package_dir" -xf -

printf '%s\n' "$local_version" > "$package_dir/artifacts/api-server/laravel/MAXIMUS_BUILD_VERSION"
mkdir -p "$(dirname -- "$OUTPUT_PATH")"
rm -f "$OUTPUT_PATH"
(cd "$temp_dir" && zip -qr "$OUTPUT_PATH" "$(basename "$package_dir")")

printf 'Archive MAXIMUS créée : %s\n' "$OUTPUT_PATH"
printf 'Version vérifiée : %s\n' "$local_version"