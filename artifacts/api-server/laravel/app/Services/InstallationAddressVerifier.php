<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Symfony\Component\HttpFoundation\IpUtils;

class InstallationAddressVerifier
{
    /** Cross-table hostname collision serialization on the production PostgreSQL database. */
    public static function lockHostname(string $hostname): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::select('SELECT pg_advisory_xact_lock(hashtext(?))', ['maximus-host:'.$hostname]);
        }
        // SQLite serializes writers; unique indexes additionally protect each table.
    }

    /** Only origins are accepted: no credentials, paths, query strings or fragments. */
    public function normalize(string $url, string $mode): array
    {
        $parts = parse_url(trim($url));
        if (!is_array($parts) || !isset($parts['scheme'], $parts['host'])
            || isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment'])
            || !in_array($parts['path'] ?? '', ['', '/'], true)) {
            throw ValidationException::withMessages(['url' => 'Indiquez une origine HTTPS sans chemin ni identifiants.']);
        }
        $host = strtolower(rtrim(trim($parts['host'], '[]'), '.'));
        $scheme = strtolower($parts['scheme']);
        $ip = filter_var($host, FILTER_VALIDATE_IP);
        if (!$ip && (!preg_match('/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/D', $host)
            || collect(explode('.', $host))->contains(fn ($label) => strlen($label) > 63 || str_starts_with($label, '-') || str_ends_with($label, '-') || $label === '')
            || preg_match('/^[0-9.]+$/D', $host))) {
            throw ValidationException::withMessages(['url' => 'Nom d’hôte non valide (utilisez sa forme ASCII).']);
        }
        $local = $this->isLocal($host);
        if (($parts['port'] ?? 1) < 1 || ($ip && !$local && !$this->isPublicIp($host))) {
            throw ValidationException::withMessages(['url' => 'Adresse IP réservée ou port non valide.']);
        }
        if (!in_array($scheme, ['http', 'https'], true) || ($scheme !== 'https' && !($local && $mode === 'on_premise'))
            || ($local && $mode !== 'on_premise') || (!$local && isset($parts['port']) && $parts['port'] !== 443)) {
            throw ValidationException::withMessages(['url' => 'HTTPS public sur le port 443 requis ; les adresses locales sont réservées au mode sur site.']);
        }
        $displayHost = str_contains($host, ':') ? '['.$host.']' : $host;
        $port = $parts['port'] ?? null;
        $suffix = $port && !(($scheme === 'https' && $port === 443) || ($scheme === 'http' && $port === 80)) ? ':'.$port : '';
        return ['url' => $scheme.'://'.$displayHost.$suffix, 'hostname' => $host, 'local' => $local];
    }

    public function isLocal(string $host): bool
    {
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return IpUtils::checkIp($host, [
                '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '127.0.0.0/8',
                '169.254.0.0/16', '100.64.0.0/10', '::1/128', 'fc00::/7', 'fe80::/10',
            ]);
        }
        return !str_contains($host, '.') || (bool) preg_match('/\.(local|lan|internal|localhost)$/D', $host);
    }

    private function isPublicIp(string $ip): bool
    {
        if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return false;
        }
        if (str_contains($ip, ':')) {
            // Only native global unicast; reject transition/tunnel and documentation ranges.
            return IpUtils::checkIp($ip, '2000::/3')
                && !IpUtils::checkIp($ip, ['2001::/23', '2001:db8::/32', '2002::/16']);
        }
        return !IpUtils::checkIp($ip, [
            '0.0.0.0/8', '100.64.0.0/10', '169.254.0.0/16', '192.0.0.0/24',
            '192.0.2.0/24', '192.88.99.0/24', '198.18.0.0/15', '198.51.100.0/24',
            '203.0.113.0/24', '224.0.0.0/4', '240.0.0.0/4',
        ]);
    }

    public function verify(object $address, object $installation): void
    {
        $origin = $this->normalize($address->url, $installation->mode);
        if ($origin['hostname'] !== $address->hostname || $origin['local'] !== ($address->validation_method === 'local')) {
            throw new RuntimeException('La méthode de validation ne correspond pas à l’adresse configurée.');
        }
        if ($address->validation_method === 'local') {
            if ($installation->mode !== 'on_premise' || !$this->isLocal($address->hostname)) {
                throw new RuntimeException('Validation locale non autorisée.');
            }
            return; // Explicit local configuration, never a claim of public DNS/TLS verification.
        }
        $records = $this->dnsRecords($address->verification_name, DNS_TXT);
        if (!collect($records)->contains(fn ($record) => hash_equals($address->verification_value, (string) ($record['txt'] ?? implode('', $record['entries'] ?? []))))) {
            throw new RuntimeException('Enregistrement TXT de propriété introuvable ou incorrect.');
        }
        $ips = array_values(array_unique(array_filter(array_map(
            fn ($record) => $record['ip'] ?? $record['ipv6'] ?? null,
            $this->dnsRecords($address->hostname, DNS_A | DNS_AAAA),
        ))));
        if (!$ips) {
            throw new RuntimeException('Aucune adresse IP publique trouvée.');
        }
        foreach ($ips as $ip) {
            if (!$this->isPublicIp($ip)) {
                throw new RuntimeException('La résolution vers une adresse privée ou réservée est interdite.');
            }
        }
        $identity = $this->fetchIdentity($address->url, $address->hostname, $ips[0]);
        if (($identity['installationId'] ?? null) !== $installation->id
            || ($identity['company']['id'] ?? null) !== $installation->company_id
            || ($identity['mode'] ?? null) !== $installation->mode) {
            throw new RuntimeException('L’identité HTTPS ne correspond pas à cette installation et entreprise.');
        }
    }

    protected function dnsRecords(string $hostname, int $type): array
    {
        return @dns_get_record($hostname, $type) ?: [];
    }

    protected function fetchIdentity(string $url, string $hostname, string $ip): array
    {
        if (!extension_loaded('curl')) {
            throw new RuntimeException('La vérification HTTPS sécurisée nécessite cURL.');
        }
        $pinned = str_contains($ip, ':') ? '['.$ip.']' : $ip;
        // Pin DNS after validating all results; disable redirects and environment proxies.
        $response = Http::connectTimeout(4)->timeout(8)->withoutRedirecting()->withOptions([
            'verify' => true,
            'proxy' => '',
            'curl' => [
                CURLOPT_RESOLVE => [$hostname.':443:'.$pinned],
                CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
                CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS,
            ],
            'on_headers' => function ($response): void {
                if ((int) $response->getHeaderLine('Content-Length') > 262144) {
                    throw new RuntimeException('Réponse d’identité trop volumineuse.');
                }
            },
            'progress' => function ($total, $downloaded): void {
                if ($downloaded > 262144) {
                    throw new RuntimeException('Réponse d’identité trop volumineuse.');
                }
            },
        ])->get($url.'/api/installation');
        if (!$response->successful() || !is_array($response->json())) {
            throw new RuntimeException('Identité HTTPS inaccessible (redirections interdites).');
        }
        return $response->json();
    }
}