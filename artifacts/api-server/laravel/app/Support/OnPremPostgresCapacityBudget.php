<?php

namespace App\Support;

use InvalidArgumentException;

final class OnPremPostgresCapacityBudget
{
    /**
     * Compare the configured PHP worker pool with PostgreSQL's usable
     * connections, leaving the operator-specified reserve for CLI and admin
     * work.
     *
     * @return array{
     *     usable_connections: int,
     *     required_connections: int,
     *     remaining_connections: int,
     *     fits: bool
     * }
     */
    public static function calculate(
        int $maxConnections,
        int $superuserReservedConnections,
        int $phpWorkers,
        int $otherConnectionReserve,
    ): array {
        if ($maxConnections < 1 || $superuserReservedConnections < 0 || $phpWorkers < 1 || $otherConnectionReserve < 0) {
            throw new InvalidArgumentException('Les limites PostgreSQL, workers PHP et réserve doivent être positives ou nulles selon leur rôle.');
        }

        $usableConnections = max(0, $maxConnections - $superuserReservedConnections);
        $requiredConnections = $phpWorkers + $otherConnectionReserve;
        $remainingConnections = $usableConnections - $requiredConnections;

        return [
            'usable_connections' => $usableConnections,
            'required_connections' => $requiredConnections,
            'remaining_connections' => $remainingConnections,
            'fits' => $remainingConnections >= 0,
        ];
    }
}
