<?php

namespace App\Support;

use InvalidArgumentException;

final class CompanyWorkspaceVisibility
{
    private const FEATURE_IDS = ['controle', 'organisation', 'guide-configuration'];

    /** @return list<string> */
    public static function normalizeHidden(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        $hidden = [];
        foreach ($value as $featureId) {
            if (is_string($featureId)
                && in_array($featureId, self::FEATURE_IDS, true)
                && ! in_array($featureId, $hidden, true)) {
                $hidden[] = $featureId;
            }
        }

        return $hidden;
    }

    /** @return list<string> */
    public static function validateHidden(mixed $value): array
    {
        if (! is_array($value) || ! array_is_list($value)) {
            throw new InvalidArgumentException('Liste des fonctionnalités masquées de l’espace entreprise invalide.');
        }

        foreach ($value as $featureId) {
            if (! is_string($featureId) || ! in_array($featureId, self::FEATURE_IDS, true)) {
                throw new InvalidArgumentException('Fonctionnalité de l’espace entreprise inconnue.');
            }
        }

        return self::normalizeHidden($value);
    }
}