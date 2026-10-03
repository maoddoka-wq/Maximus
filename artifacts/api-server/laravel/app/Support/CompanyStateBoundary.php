<?php

namespace App\Support;

/**
 * Validate the browser snapshot before merging anything into shared state.
 * This pure boundary never reads the database or changes the submitted records.
 */
final class CompanyStateBoundary
{
    /** @return array{error: string, status: int}|null */
    public static function violation(
        array $current,
        array $incoming,
        string $companyId,
        string $role,
        array $companyCollections,
    ): ?array {
        foreach ($companyCollections as $collection) {
            if (! array_key_exists($collection, $incoming)) {
                continue;
            }
            if (! is_array($incoming[$collection]) || ! array_is_list($incoming[$collection])) {
                return ['error' => 'Les collections métier doivent être des listes de records.', 'status' => 422];
            }

            // Index once: large snapshots must not require a quadratic scan.
            $existingById = [];
            foreach ($current[$collection] ?? [] as $record) {
                if (is_array($record) && isset($record['id'])) {
                    $existingById[(string) $record['id']] = $record;
                }
            }
            foreach ($incoming[$collection] as $record) {
                if (! is_array($record) || ! isset($record['id'])
                    || (! is_string($record['id']) && ! is_int($record['id']))) {
                    return ['error' => 'Chaque record métier doit avoir un identifiant.', 'status' => 422];
                }
                foreach (['companyId', 'company_id'] as $ownerKey) {
                    if (isset($record[$ownerKey]) && ! is_string($record[$ownerKey])) {
                        return ['error' => 'L’identifiant d’entreprise doit être une chaîne.', 'status' => 422];
                    }
                }
                $existing = $existingById[(string) $record['id']] ?? null;
                if ($existing === null) {
                    continue;
                }
                $owner = $collection === 'companies'
                    ? ($existing['id'] ?? null)
                    : ($existing['companyId'] ?? $existing['company_id'] ?? null);
                if ($owner !== $companyId) {
                    return ['error' => 'Un record d’une autre entreprise ne peut pas être modifié.', 'status' => 403];
                }
            }
        }

        if ($role === 'company_admin') {
            foreach ($incoming as $key => $value) {
                if (! in_array($key, $companyCollections, true)
                    && $key !== 'commerceStates'
                    && ($current[$key] ?? null) !== $value) {
                    return ['error' => 'La configuration globale est réservée à MAXIMUS.', 'status' => 403];
                }
            }
        }

        return null;
    }
}
