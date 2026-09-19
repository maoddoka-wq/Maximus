<?php

namespace App\Support;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class CompanyInstallationAccess
{
    /**
     * Build presentation state for several companies with a fixed query count.
     *
     * @param  iterable<string>  $companyIds
     * @return Collection<string, array{state: string, installationId: ?string, mode: ?string, endpointUrl: ?string}>
     */
    public static function forCompanies(iterable $companyIds): Collection
    {
        $ids = collect($companyIds)->map(fn (mixed $id): string => (string) $id)->filter()->unique()->values();
        if ($ids->isEmpty()) {
            return collect();
        }

        $installations = DB::table('maximus_installations')
            ->whereIn('company_id', $ids->all())
            ->orderBy('created_at')
            ->get();
        $addresses = DB::table('maximus_installation_addresses')
            ->whereIn('installation_id', $installations->pluck('id')->all())
            ->where('is_primary', true)
            ->where('status', 'ACTIVE')
            ->get()
            ->keyBy('installation_id');
        $primaryIds = DB::table('companies')
            ->whereIn('id', $ids->all())
            ->pluck('erp_installation_id', 'id');
        $byCompany = $installations->groupBy('company_id');

        return $ids->mapWithKeys(function (string $companyId) use ($byCompany, $primaryIds, $addresses): array {
            $companyInstallations = $byCompany->get($companyId, collect());
            $primaryId = $primaryIds->get($companyId);
            if (! is_string($primaryId) || $primaryId === '') {
                $hasPrepared = $companyInstallations->contains(
                    fn (object $installation): bool => self::available($installation),
                );
                return [$companyId => [
                    'state' => $hasPrepared ? 'prepared' : 'central',
                    'installationId' => null,
                    'mode' => null,
                    'endpointUrl' => null,
                ]];
            }

            $installation = $companyInstallations->first(fn (object $item): bool => (string) $item->id === $primaryId);
            $address = $installation ? $addresses->get($primaryId) : null;
            $endpoint = $address && self::safeUrl($address->url) ? (string) $address->url : null;
            if (! $installation || ! self::available($installation) || $endpoint === null) {
                return [$companyId => [
                    'state' => 'unavailable',
                    'installationId' => $primaryId,
                    'mode' => $installation && in_array($installation->mode, ['dedicated', 'on_premise'], true)
                        ? $installation->mode
                        : null,
                    'endpointUrl' => null,
                ]];
            }

            return [$companyId => [
                'state' => 'primary',
                'installationId' => $primaryId,
                'mode' => $installation->mode,
                'endpointUrl' => $endpoint,
            ]];
        });
    }

    public static function forCompany(string $companyId): array
    {
        return self::forCompanies([$companyId])->get($companyId, [
            'state' => 'central',
            'installationId' => null,
            'mode' => null,
            'endpointUrl' => null,
        ]);
    }

    private static function available(object $installation): bool
    {
        return $installation->revoked_at === null
            && in_array($installation->status, ['READY', 'CONNECTED'], true)
            && in_array($installation->mode, ['dedicated', 'on_premise'], true);
    }

    private static function safeUrl(mixed $value): bool
    {
        if (! is_string($value) || trim($value) !== $value || $value === '') {
            return false;
        }
        $parts = parse_url($value);
        return is_array($parts)
            && in_array(strtolower((string) ($parts['scheme'] ?? '')), ['http', 'https'], true)
            && is_string($parts['host'] ?? null)
            && ($parts['host'] ?? '') !== ''
            && ! isset($parts['user'])
            && ! isset($parts['pass']);
    }
}