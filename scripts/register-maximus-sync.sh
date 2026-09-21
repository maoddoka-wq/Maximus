#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
LARAVEL_DIR="$WORKSPACE_DIR/artifacts/api-server/laravel"
INTERVAL_MINUTES=1
REMOVE=0
TASK_MARKER="# maximus-central-scheduler"

usage() {
    cat <<'EOF'
Usage: scripts/register-maximus-sync.sh [options]

Installe ou met à jour le déclencheur système du scheduler Laravel MAXIMUS.
La synchronisation centrale reste limitée aux installations dédiées.

Options:
  --workspace-dir PATH     Racine du workspace MAXIMUS
  --interval-minutes N     Fréquence du scheduler (défaut: 1)
  --remove                 Supprimer le déclencheur installé par ce script
  -h, --help               Afficher cette aide
EOF
}

fail() {
    printf 'Scheduler MAXIMUS non configuré : %s\n' "$1" >&2
    exit 1
}

while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --workspace-dir)
            [[ "$#" -ge 2 ]] || fail "--workspace-dir attend un chemin."
            WORKSPACE_DIR="$(cd -- "$2" && pwd)"
            LARAVEL_DIR="$WORKSPACE_DIR/artifacts/api-server/laravel"
            shift 2
            ;;
        --interval-minutes)
            [[ "$#" -ge 2 ]] || fail "--interval-minutes attend un nombre."
            INTERVAL_MINUTES="$2"
            shift 2
            ;;
        --remove)
            REMOVE=1
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            fail "Option inconnue : $1"
            ;;
    esac
done

[[ "$INTERVAL_MINUTES" =~ ^[1-9][0-9]*$ ]] || fail "L’intervalle doit être un nombre entier positif."

# Git Bash on Windows uses this same entry point. Delegate to the native task
# scheduler instead of attempting to write a Unix crontab there.
if ! command -v crontab >/dev/null 2>&1 \
    && command -v powershell.exe >/dev/null 2>&1 \
    && command -v cygpath >/dev/null 2>&1; then
    powershell_script="$(cygpath -w "$SCRIPT_DIR/register-maximus-sync.ps1")"
    windows_workspace="$(cygpath -w "$WORKSPACE_DIR")"
    powershell_args=(
        -NoProfile -ExecutionPolicy Bypass -File "$powershell_script"
        -WorkspaceDir "$windows_workspace"
        -IntervalMinutes "$INTERVAL_MINUTES"
    )
    if [[ "$REMOVE" -eq 1 ]]; then
        powershell_args+=(-Remove)
    fi
    exec powershell.exe "${powershell_args[@]}"
fi

command -v crontab >/dev/null 2>&1 || fail "crontab est introuvable. Installez cron ou utilisez PowerShell sous Windows."
[[ -d "$LARAVEL_DIR" ]] || fail "Dossier Laravel introuvable : $LARAVEL_DIR"

if [[ "$REMOVE" -eq 0 ]]; then
    mkdir -p "$LARAVEL_DIR/storage/logs"
fi

temporary="$(mktemp)"
cleanup() {
    rm -f "$temporary"
}
trap cleanup EXIT

(crontab -l 2>/dev/null || true) | grep -vF "$TASK_MARKER" >"$temporary" || true

if [[ "$REMOVE" -eq 0 ]]; then
    php_bin="$(command -v php || true)"
    [[ -n "$php_bin" ]] || fail "PHP est introuvable."
    log_file="$LARAVEL_DIR/storage/logs/installation-scheduler.log"
    cron_line="*/${INTERVAL_MINUTES} * * * * cd $(printf '%q' "$LARAVEL_DIR") && $(printf '%q' "$php_bin") artisan schedule:run --no-ansi >> $(printf '%q' "$log_file") 2>&1 ${TASK_MARKER}"
    printf '%s\n' "$cron_line" >>"$temporary"
fi

crontab "$temporary"

if [[ "$REMOVE" -eq 1 ]]; then
    printf 'Scheduler MAXIMUS supprimé.\n'
else
    printf 'Scheduler MAXIMUS activé toutes les %s minute(s).\n' "$INTERVAL_MINUTES"
fi