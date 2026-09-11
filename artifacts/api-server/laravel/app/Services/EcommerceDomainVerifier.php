<?php

namespace App\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class EcommerceDomainVerifier
{
    public const REVALIDATION_INTERVAL_MINUTES = 15;

    public function __construct(
        private readonly ?\Closure $dnsRecordLookup = null,
    ) {
    }

    public function normalize(string $value): ?string
    {
        $domain = Str::lower(trim($value));
        $domain = preg_replace('#^https?://#', '', $domain) ?? '';
        $domain = preg_replace('#/.*$#', '', $domain) ?? '';
        $domain = preg_replace('/:\d+$/', '', $domain) ?? '';
        $domain = rtrim($domain, '.');
        if ($domain === '' || strlen($domain) > 253 || ! filter_var($domain, FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME)) {
            return null;
        }

        return $domain;
    }

    public function activeForHost(string $host): ?object
    {
        $domain = $this->normalize($host);
        if (! $domain) {
            return null;
        }

        $row = DB::table('ecommerce_domains')
            ->where('domain', $domain)
            ->where('status', 'ACTIVE')
            ->first();
        if (! $row || ! $this->revalidateIfDue($row)) {
            return null;
        }

        return $row;
    }

    public function hasValidDnsProof(object $row): bool
    {
        $verificationName = '_maximus-verification.'.$row->domain;
        $txtRecords = $this->records($verificationName, DNS_TXT);
        $verifiedByTxt = collect($txtRecords)->contains(
            fn (array $record): bool => trim((string) ($record['txt'] ?? '')) === (string) $row->verification_token,
        );

        $cnameRecords = $this->records($row->domain, DNS_CNAME);
        $expectedTarget = rtrim(Str::lower((string) $row->target_host), '.');
        $verifiedByCname = collect($cnameRecords)->contains(
            fn (array $record): bool => rtrim(Str::lower((string) ($record['target'] ?? '')), '.') === $expectedTarget,
        );

        return $verifiedByTxt || $verifiedByCname;
    }

    private function revalidateIfDue(object $row): bool
    {
        if ($this->wasRecentlyVerified($row)) {
            return true;
        }

        if (! $this->hasValidDnsProof($row)) {
            DB::table('ecommerce_domains')
                ->where('id', $row->id)
                ->where('status', 'ACTIVE')
                ->update([
                    'status' => 'PENDING',
                    'last_error' => 'La preuve DNS du domaine actif n’est plus valide. Ajoutez à nouveau le TXT ou CNAME indiqué puis réessayez.',
                    'updated_at' => now(),
                ]);

            return false;
        }

        DB::table('ecommerce_domains')
            ->where('id', $row->id)
            ->where('status', 'ACTIVE')
            ->update([
                'last_error' => '',
                'verified_at' => now(),
                'updated_at' => now(),
            ]);

        return true;
    }

    private function wasRecentlyVerified(object $row): bool
    {
        if (! $row->verified_at) {
            return false;
        }

        return Carbon::parse($row->verified_at)
            ->greaterThan(now()->subMinutes(self::REVALIDATION_INTERVAL_MINUTES));
    }

    private function records(string $name, int $type): array
    {
        if ($this->dnsRecordLookup) {
            return ($this->dnsRecordLookup)($name, $type);
        }

        if (! function_exists('dns_get_record')) {
            return [];
        }

        return @dns_get_record($name, $type) ?: [];
    }
}