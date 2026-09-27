<?php

namespace App\Services;

use App\Services\InstallationAddressVerifier;
use App\Support\InstallationContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class PublicSiteDomainService
{
    public function __construct(
        private readonly EcommerceDomainVerifier $domainVerifier,
    ) {
    }

    public function forCompany(string $companyId): array
    {
        return DB::table('ecommerce_domains')
            ->where('company_id', $companyId)
            ->whereNull('deleted_at')
            ->orderBy('domain')
            ->get()
            ->map(fn ($row) => $this->payload($row))
            ->values()
            ->all();
    }

    public function normalize(string $domain): ?string
    {
        return $this->domainVerifier->normalize($domain);
    }

    public function exists(string $domain): bool
    {
        return DB::table('ecommerce_domains')
            ->where('domain', $domain)
            ->whereNull('deleted_at')
            ->exists();
    }

    public function create(Request $request, string $companyId, string $domain): array
    {
        $row = [
            'id' => 'domain-'.Str::uuid(),
            'company_id' => $companyId,
            'domain' => $domain,
            'target_host' => $this->targetHost($request),
            'verification_token' => 'maximus-'.Str::lower(Str::random(40)),
            'status' => 'PENDING',
            'last_error' => '',
            'verified_at' => null,
            'deleted_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        DB::transaction(function () use ($domain, $row): void {
            InstallationAddressVerifier::lockHostname($domain);
            $centralHost = strtolower((string) parse_url((string) config('maximus.central_public_url'), PHP_URL_HOST));
            if (DB::table('maximus_installation_addresses')->where('hostname', $domain)->where('validation_method', 'public')->exists()
                || in_array($domain, InstallationContext::trustedHosts(), true)
                || $domain === $centralHost) {
                throw ValidationException::withMessages(['domain' => 'Ce nom d’hôte est réservé à un accès ERP.']);
            }
            if ($this->exists($domain)) {
                throw ValidationException::withMessages(['domain' => 'Ce domaine est déjà rattaché à un site public.']);
            }

            DB::table('ecommerce_domains')->insert($row);
        });

        return $this->payload((object) $row);
    }

    public function verify(string $companyId, string $id): ?array
    {
        $row = DB::table('ecommerce_domains')
            ->where('id', $id)
            ->where('company_id', $companyId)
            ->whereNull('deleted_at')
            ->first();
        if (! $row) {
            return null;
        }

        if (! $this->domainVerifier->hasValidDnsProof($row)) {
            DB::table('ecommerce_domains')->where('id', $row->id)->update([
                'status' => 'PENDING',
                'last_error' => 'Aucun enregistrement TXT ou CNAME correspondant n’a été trouvé.',
                'updated_at' => now(),
            ]);

            return [
                'verified' => false,
                'domain' => $this->payload(DB::table('ecommerce_domains')->where('id', $row->id)->first()),
            ];
        }

        DB::table('ecommerce_domains')->where('id', $row->id)->update([
            'status' => 'ACTIVE',
            'last_error' => '',
            'verified_at' => now(),
            'updated_at' => now(),
        ]);

        return [
            'verified' => true,
            'domain' => $this->payload(DB::table('ecommerce_domains')->where('id', $row->id)->first()),
        ];
    }

    public function archive(string $companyId, string $id): bool
    {
        return DB::table('ecommerce_domains')
            ->where('id', $id)
            ->where('company_id', $companyId)
            ->whereNull('deleted_at')
            ->update([
                'status' => 'ARCHIVED',
                'deleted_at' => now(),
                'updated_at' => now(),
            ]) > 0;
    }

    private function targetHost(Request $request): string
    {
        $configured = (string) env('MAXIMUS_CUSTOM_DOMAIN_TARGET', '');
        if ($configured !== '') {
            return rtrim(Str::lower($configured), '.');
        }

        return $this->domainVerifier->normalize($request->getHost()) ?? $request->getHost();
    }

    private function payload(object $row): array
    {
        return [
            'id' => (string) $row->id,
            'companyId' => (string) $row->company_id,
            'domain' => (string) $row->domain,
            'targetHost' => (string) $row->target_host,
            'verificationName' => '_maximus-verification.'.$row->domain,
            'verificationValue' => (string) $row->verification_token,
            'status' => (string) $row->status,
            'lastError' => (string) ($row->last_error ?? ''),
            'verifiedAt' => $row->verified_at,
        ];
    }
}