#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
LARAVEL_DIR="$WORKSPACE_DIR/artifacts/api-server/laravel"
PUBLIC_DIR="$LARAVEL_DIR/public"
ENV_FILE="$LARAVEL_DIR/.env"
FPM_POOL_NAME="maximus"
FPM_POOL_FILE="/etc/php/8.2/fpm/pool.d/${FPM_POOL_NAME}.conf"
FPM_SOCKET="/run/php/${FPM_POOL_NAME}.sock"
NGINX_SITE_FILE="/etc/nginx/sites-available/${FPM_POOL_NAME}.conf"
NGINX_ENABLED_FILE="/etc/nginx/sites-enabled/${FPM_POOL_NAME}.conf"

fail() { printf 'Installation LAN MAXIMUS interrompue : %s\n' "$1" >&2; exit 1; }
log() { printf '\n==> %s\n' "$1"; }
need_arg() { [[ -n "${2:-}" ]] || fail "$1 est requis."; }
is_uint() { [[ "$1" =~ ^(0|[1-9][0-9]*)$ ]]; }

usage() {
    cat <<'EOF'
Usage:
  sudo bash scripts/install-maximus-lan-linux.sh
    --lan-ip ADDRESS --lan-cidr CIDR --hostname NAME
    --tls-cert FILE --tls-key FILE --run-as-user USER
    --php-workers N --worker-memory-mb MB --system-db-reserve-mb MB
    --db-reserve N --request-body-mb MB

    Le serveur Debian/Ubuntu, Nginx, PHP-FPM 8.2, curl et openssl doivent déjà
être installés. Ce script ne génère aucun certificat et n'active pas UFW.
EOF
}

LAN_IP=""
LAN_CIDR=""
HOSTNAME=""
TLS_CERT=""
TLS_KEY=""
RUN_AS_USER=""
PHP_WORKERS=""
WORKER_MEMORY_MB=""
SYSTEM_DB_RESERVE_MB=""
DB_RESERVE=""
REQUEST_BODY_MB=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --lan-ip) [[ $# -ge 2 ]] || fail "--lan-ip attend une valeur."; LAN_IP="$2"; shift 2 ;;
        --lan-cidr) [[ $# -ge 2 ]] || fail "--lan-cidr attend une valeur."; LAN_CIDR="$2"; shift 2 ;;
        --hostname|--internal-hostname) [[ $# -ge 2 ]] || fail "--hostname attend une valeur."; HOSTNAME="$2"; shift 2 ;;
        --tls-cert) [[ $# -ge 2 ]] || fail "--tls-cert attend un fichier."; TLS_CERT="$2"; shift 2 ;;
        --tls-key) [[ $# -ge 2 ]] || fail "--tls-key attend un fichier."; TLS_KEY="$2"; shift 2 ;;
        --run-as-user) [[ $# -ge 2 ]] || fail "--run-as-user attend un utilisateur."; RUN_AS_USER="$2"; shift 2 ;;
        --php-workers) [[ $# -ge 2 ]] || fail "--php-workers attend un nombre."; PHP_WORKERS="$2"; shift 2 ;;
        --worker-memory-mb) [[ $# -ge 2 ]] || fail "--worker-memory-mb attend un nombre."; WORKER_MEMORY_MB="$2"; shift 2 ;;
        --system-db-reserve-mb) [[ $# -ge 2 ]] || fail "--system-db-reserve-mb attend un nombre."; SYSTEM_DB_RESERVE_MB="$2"; shift 2 ;;
        --db-reserve) [[ $# -ge 2 ]] || fail "--db-reserve attend un nombre."; DB_RESERVE="$2"; shift 2 ;;
        --request-body-mb) [[ $# -ge 2 ]] || fail "--request-body-mb attend un nombre."; REQUEST_BODY_MB="$2"; shift 2 ;;
        -h|--help) usage; exit 0 ;;
        *) fail "Option inconnue : $1 (utilisez --help)." ;;
    esac
done

[[ "$(id -u)" -eq 0 ]] || fail "Lancez ce script avec sudo/root."
[[ -f /etc/debian_version ]] || fail "Ce script cible uniquement Debian/Ubuntu."
[[ -d "$LARAVEL_DIR" && -d "$PUBLIC_DIR" ]] || fail "Racine Laravel MAXIMUS introuvable : $LARAVEL_DIR"
[[ -f "$ENV_FILE" ]] || fail "Configuration Laravel absente : $ENV_FILE"
[[ -f "$PUBLIC_DIR/index.php" && -f "$PUBLIC_DIR/index.html" ]] || fail "Le frontend compilé ou public/index.php est absent."

for value_name in LAN_IP LAN_CIDR HOSTNAME TLS_CERT TLS_KEY RUN_AS_USER PHP_WORKERS WORKER_MEMORY_MB SYSTEM_DB_RESERVE_MB DB_RESERVE REQUEST_BODY_MB; do
    need_arg "--${value_name,,}" "${!value_name}"
done
for command_name in nginx php-fpm8.2 php curl openssl getent runuser ip find; do
    command -v "$command_name" >/dev/null 2>&1 || fail "Commande déjà installée requise absente : $command_name"
done
[[ -x /usr/sbin/php-fpm8.2 ]] || fail "Binaire PHP-FPM 8.2 introuvable : /usr/sbin/php-fpm8.2"
[[ -d /etc/php/8.2/fpm ]] || fail "Configuration PHP-FPM 8.2 introuvable."
[[ -d /etc/php/8.2/fpm/pool.d ]] || fail "Dossier de pools PHP-FPM 8.2 introuvable."

is_uint "$PHP_WORKERS" && (( PHP_WORKERS > 0 )) || fail "--php-workers doit être un entier supérieur à zéro."
is_uint "$WORKER_MEMORY_MB" && (( WORKER_MEMORY_MB >= 64 )) || fail "--worker-memory-mb doit être au moins 64."
is_uint "$SYSTEM_DB_RESERVE_MB" && (( SYSTEM_DB_RESERVE_MB >= 256 )) || fail "--system-db-reserve-mb doit être au moins 256."
is_uint "$DB_RESERVE" && (( DB_RESERVE > 0 )) || fail "--db-reserve doit réserver au moins une connexion PostgreSQL."
is_uint "$REQUEST_BODY_MB" && (( REQUEST_BODY_MB > 0 )) || fail "--request-body-mb doit être supérieur à zéro."
(( PHP_WORKERS <= 512 )) || fail "--php-workers ne peut pas dépasser 512."
(( WORKER_MEMORY_MB <= 4096 )) || fail "--worker-memory-mb ne peut pas dépasser 4096."
(( SYSTEM_DB_RESERVE_MB <= 1048576 )) || fail "--system-db-reserve-mb ne peut pas dépasser 1048576."
(( DB_RESERVE <= 10000 )) || fail "--db-reserve ne peut pas dépasser 10000."
(( REQUEST_BODY_MB <= 512 )) || fail "--request-body-mb ne peut pas dépasser 512."

[[ "$LAN_IP" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || fail "--lan-ip doit être une adresse IPv4."
[[ "$LAN_CIDR" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}/([0-9]|[12][0-9]|3[0-2])$ ]] || fail "--lan-cidr doit être un CIDR IPv4."
php -r '
    $ip = filter_var($argv[1], FILTER_VALIDATE_IP, FILTER_FLAG_IPV4);
    [$network, $prefix] = explode("/", $argv[2], 2);
    $network = filter_var($network, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4);
    if ($ip === false || $network === false) exit(1);
    $prefix = (int) $prefix;
    $mask = $prefix === 0 ? 0 : ((0xffffffff << (32 - $prefix)) & 0xffffffff);
    $networkLong = ip2long($network);
    if (($networkLong & $mask) !== $networkLong) exit(1);
    if ((ip2long($ip) & $mask) !== $networkLong) exit(1);
' "$LAN_IP" "$LAN_CIDR" || fail "--lan-ip doit être une IPv4 comprise dans --lan-cidr."
ip -o -4 addr show | awk '{split($4, address, "/"); print address[1]}' | grep -Fxq "$LAN_IP" \
    || fail "L'adresse $LAN_IP n'est pas configurée sur une interface locale."
[[ "${#HOSTNAME}" -le 253 && "$HOSTNAME" =~ ^([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)*[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$ ]] \
    || fail "Nom d'hôte interne invalide : $HOSTNAME"
getent ahostsv4 "$HOSTNAME" | awk '{print $1}' | grep -Fxq "$LAN_IP" \
    || fail "Le DNS interne de $HOSTNAME doit pointer vers l'adresse LAN $LAN_IP."
[[ "$PUBLIC_DIR$TLS_CERT$TLS_KEY" != *[!a-zA-Z0-9_./-]* ]] \
    || fail "Les chemins Nginx ne peuvent contenir que des lettres, chiffres, points, tirets, underscores et barres obliques."
[[ "$TLS_CERT" == /* && "$TLS_KEY" == /* ]] || fail "Les chemins de certificat et de clé TLS doivent être absolus."
[[ -f "$TLS_CERT" && -r "$TLS_CERT" ]] || fail "Certificat TLS introuvable ou illisible : $TLS_CERT"
[[ -f "$TLS_KEY" && -r "$TLS_KEY" ]] || fail "Clé TLS introuvable ou illisible : $TLS_KEY"
tls_key_mode="$(stat -c '%a' "$TLS_KEY")"
(( (8#$tls_key_mode & 077) == 0 )) || fail "La clé TLS ne doit pas être lisible par le groupe ou les autres comptes (chmod 600 recommandé)."
openssl x509 -in "$TLS_CERT" -noout >/dev/null 2>&1 || fail "Certificat TLS invalide : $TLS_CERT"
openssl x509 -in "$TLS_CERT" -checkend 0 -noout >/dev/null || fail "Le certificat TLS est expiré."
openssl x509 -in "$TLS_CERT" -checkhost "$HOSTNAME" -noout >/dev/null 2>&1 || fail "Le certificat TLS ne couvre pas $HOSTNAME."
cert_pub="$(openssl x509 -in "$TLS_CERT" -pubkey -noout | openssl pkey -pubin -outform pem 2>/dev/null | sha256sum)"
key_pub="$(openssl pkey -in "$TLS_KEY" -passin pass: -pubout -outform pem 2>/dev/null | sha256sum)" || fail "Clé TLS invalide ou chiffrée; le script exige une clé non chiffrée protégée par des permissions root : $TLS_KEY"
[[ "$cert_pub" == "$key_pub" ]] || fail "La clé TLS ne correspond pas au certificat."

getent passwd "$RUN_AS_USER" >/dev/null || fail "Utilisateur Linux inexistant : $RUN_AS_USER"
getent passwd www-data >/dev/null || fail "Compte Nginx Debian/Ubuntu www-data introuvable."
run_uid="$(id -u "$RUN_AS_USER")"
run_gid="$(id -g "$RUN_AS_USER")"
[[ "$run_uid" -ne 0 ]] || fail "L'utilisateur PHP ne doit pas être root."
[[ -r "$ENV_FILE" ]] || fail ".env illisible : $ENV_FILE"
chown "$RUN_AS_USER:$run_gid" "$ENV_FILE"
chmod 600 "$ENV_FILE"
for writable_dir in "$LARAVEL_DIR/storage" "$LARAVEL_DIR/bootstrap/cache"; do
    [[ -d "$writable_dir" ]] || mkdir -p "$writable_dir"
    chown -R "$RUN_AS_USER:$run_gid" "$writable_dir"
    chmod u+rwX "$writable_dir"
done
runuser -u www-data -- test -x "$PUBLIC_DIR" && runuser -u www-data -- test -r "$PUBLIC_DIR/index.html" \
    || fail "Nginx (www-data) doit pouvoir traverser public/ et lire index.html; placez le dépôt sous /srv/maximus avec des permissions de lecture statique."
unreadable_public_file="$(runuser -u www-data -- find "$PUBLIC_DIR" -type f ! -readable -print -quit 2>/dev/null)" \
    || fail "Nginx ne peut pas parcourir toutes les ressources de public/."
[[ -z "$unreadable_public_file" ]] || fail "Nginx (www-data) ne peut pas lire une ressource publique : $unreadable_public_file"
if [[ -d "$PUBLIC_DIR/storage" ]]; then
    unreadable_storage_file="$(runuser -u www-data -- find -L "$PUBLIC_DIR/storage" -type f ! -readable -print -quit 2>/dev/null)" \
        || fail "Nginx ne peut pas parcourir les ressources publiques liées sous public/storage."
    [[ -z "$unreadable_storage_file" ]] || fail "Nginx (www-data) ne peut pas lire une ressource publique sous public/storage : $unreadable_storage_file"
fi

mem_kb="$(awk '/^MemTotal:/ {print $2; exit}' /proc/meminfo)"
required_kb=$((PHP_WORKERS * WORKER_MEMORY_MB * 1024 + SYSTEM_DB_RESERVE_MB * 1024))
(( mem_kb >= required_kb )) || fail "RAM insuffisante : ${mem_kb} KiB disponibles, ${required_kb} KiB requis (workers + réserve système/DB)."

app_url="$(grep -E '^APP_URL=' "$ENV_FILE" | tail -n 1 | sed 's/^APP_URL=//; s/^"//; s/"$//' || true)"
[[ "$app_url" == "https://$HOSTNAME" || "$app_url" == "https://$HOSTNAME/" ]] || fail "APP_URL doit être exactement https://$HOSTNAME."
grep -qE '^APP_ENV="production"$|^APP_ENV=production$' "$ENV_FILE" || fail "APP_ENV doit être production."
grep -qE '^APP_DEBUG="false"$|^APP_DEBUG=false$' "$ENV_FILE" || fail "APP_DEBUG doit être false."
grep -qE '^SESSION_SECURE_COOKIE="true"$|^SESSION_SECURE_COOKIE=true$' "$ENV_FILE" || fail "SESSION_SECURE_COOKIE doit être true."

(cd "$LARAVEL_DIR" && runuser -u "$RUN_AS_USER" -- php artisan config:clear --no-interaction >/dev/null) \
    || fail "Impossible de recharger la configuration Laravel pour le précontrôle."
(cd "$LARAVEL_DIR" && runuser -u "$RUN_AS_USER" -- env APP_ENV=production php artisan maximus:check-on-prem-capacity --php-workers="$PHP_WORKERS" --db-reserve="$DB_RESERVE" --url="https://$HOSTNAME") \
    || fail "Le précontrôle MAXIMUS local a échoué; aucun virtual host n'a été modifié."

backup_file() {
    local file="$1"
    if [[ -e "$file" ]]; then
        cp -a -- "$file" "${file}.maximus-backup.$(date +%Y%m%d%H%M%S)"
    fi
}

log "Écriture idempotente du pool PHP-FPM et du vhost Nginx"
backup_file "$FPM_POOL_FILE"
backup_file "$NGINX_SITE_FILE"
install -d -m 0755 /etc/nginx/sites-available /etc/nginx/sites-enabled
fpm_start_servers=$(( PHP_WORKERS < 4 ? PHP_WORKERS : 4 ))
fpm_min_spare=$(( PHP_WORKERS < 2 ? PHP_WORKERS : 2 ))
fpm_max_spare=$(( PHP_WORKERS < 8 ? PHP_WORKERS : 8 ))
cat > "$FPM_POOL_FILE" <<EOF
[${FPM_POOL_NAME}]
user = ${RUN_AS_USER}
group = ${run_gid}
listen = ${FPM_SOCKET}
listen.owner = www-data
listen.group = www-data
listen.mode = 0660
pm = dynamic
pm.max_children = ${PHP_WORKERS}
pm.start_servers = ${fpm_start_servers}
pm.min_spare_servers = ${fpm_min_spare}
pm.max_spare_servers = ${fpm_max_spare}
pm.max_requests = 500
request_terminate_timeout = 120s
php_admin_value[memory_limit] = ${WORKER_MEMORY_MB}M
php_admin_value[upload_max_filesize] = ${REQUEST_BODY_MB}M
php_admin_value[post_max_size] = ${REQUEST_BODY_MB}M
EOF
cat > "$NGINX_SITE_FILE" <<EOF
server {
    listen ${LAN_IP}:443 ssl http2;
    server_name ${HOSTNAME};
    root ${PUBLIC_DIR};
    index index.html;
    client_max_body_size ${REQUEST_BODY_MB}m;
    client_body_timeout 60s;
    keepalive_timeout 65s;

    ssl_certificate ${TLS_CERT};
    ssl_certificate_key ${TLS_KEY};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:MAXIMUS:10m;

    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https:; manifest-src 'self'; worker-src 'self' blob:; frame-src 'none'; upgrade-insecure-requests" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location ~ /\.(?!well-known) { deny all; }
    location = /client-app {
        rewrite ^ /index.html last;
    }
    location = /client-app/ {
        rewrite ^ /index.html last;
    }
    location ^~ /api {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }
    location = /up {
        try_files \$uri /index.php?\$query_string;
    }
    location ~* \.(?:js|mjs|css|json|webmanifest|svg|png|jpg|jpeg|webp|gif|ico|woff|woff2|ttf|wasm|txt)$ {
        try_files \$uri =404;
    }
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    location = /index.php {
        try_files \$uri =404;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
        fastcgi_param HTTP_HOST \$host;
        fastcgi_param SERVER_PORT \$server_port;
        fastcgi_param HTTPS on;
        fastcgi_param HTTP_AUTHORIZATION \$http_authorization;
        fastcgi_param HTTP_X_XSRF_TOKEN \$http_x_xsrf_token;
        fastcgi_param HTTP_PROXY "";
        fastcgi_pass unix:${FPM_SOCKET};
        fastcgi_read_timeout 120s;
    }
    location ~ \.php(?:/|$) { return 404; }
}
EOF
ln -sfn "$NGINX_SITE_FILE" "$NGINX_ENABLED_FILE"

log "Précontrôles PHP-FPM, Laravel et Nginx"
php-fpm8.2 -t || fail "La configuration PHP-FPM est invalide."
nginx -t || fail "La configuration Nginx est invalide; les services n'ont pas été rechargés."

systemctl enable php8.2-fpm nginx
systemctl reload php8.2-fpm 2>/dev/null || systemctl restart php8.2-fpm
systemctl reload nginx 2>/dev/null || systemctl restart nginx

if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q '^Status: active'; then
    ufw allow from "$LAN_CIDR" to "$LAN_IP" port 443 proto tcp comment 'MAXIMUS LAN HTTPS' >/dev/null || fail "Impossible de limiter UFW à $LAN_CIDR vers $LAN_IP:443."
fi

log "Vérification HTTPS avec le certificat fourni"
curl --noproxy '*' --fail --silent --show-error --max-time 20 --resolve "${HOSTNAME}:443:${LAN_IP}" "https://${HOSTNAME}/api/healthz" >/dev/null \
    || fail "La sonde HTTPS /api/healthz a échoué; vérifiez DNS interne, certificat, firewall et PostgreSQL."

printf '\nInstallation LAN MAXIMUS terminée : https://%s (écoute uniquement sur %s:443)\n' "$HOSTNAME" "$LAN_IP"