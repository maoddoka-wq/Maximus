<?php

namespace App\Services;

use App\Models\SystemHealthIncident;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Throwable;

class SystemHealthService
{
    private const REQUIRED_TABLES = [
        'auth_users',
        'companies',
        'control_tasks',
        'ecommerce_stores',
    ];

    public function run(bool $persist = true): array
    {
        $checkedAt = now();
        $checks = [
            [
                'key' => 'application',
                'label' => 'Application Laravel',
                'status' => 'UP',
                'severity' => 'info',
                'message' => 'Le serveur Laravel répond correctement.',
            ],
        ];

        $databaseUp = false;
        try {
            DB::connection()->getPdo();
            DB::select('select 1');
            $databaseUp = true;
            $checks[] = [
                'key' => 'database',
                'label' => 'PostgreSQL',
                'status' => 'UP',
                'severity' => 'info',
                'message' => 'La connexion PostgreSQL est disponible.',
            ];
        } catch (Throwable $exception) {
            report($exception);
            $checks[] = [
                'key' => 'database',
                'label' => 'PostgreSQL',
                'status' => 'DOWN',
                'severity' => 'critical',
                'message' => 'La connexion PostgreSQL est indisponible.',
            ];
        }

        if ($databaseUp) {
            try {
                $missingTables = collect(self::REQUIRED_TABLES)
                    ->filter(fn (string $table): bool => ! Schema::hasTable($table))
                    ->values()
                    ->all();
                $checks[] = [
                    'key' => 'schema',
                    'label' => 'Schéma de données',
                    'status' => $missingTables === [] ? 'UP' : 'DOWN',
                    'severity' => $missingTables === [] ? 'info' : 'critical',
                    'message' => $missingTables === []
                        ? 'Les tables principales sont disponibles.'
                        : 'Des tables nécessaires sont absentes.',
                    'details' => $missingTables === [] ? [] : ['missingTables' => $missingTables],
                ];
            } catch (Throwable $exception) {
                report($exception);
                $checks[] = [
                    'key' => 'schema',
                    'label' => 'Schéma de données',
                    'status' => 'DOWN',
                    'severity' => 'critical',
                    'message' => 'Le schéma de données n’a pas pu être vérifié.',
                ];
            }
        } else {
            $checks[] = [
                'key' => 'schema',
                'label' => 'Schéma de données',
                'status' => 'UNKNOWN',
                'severity' => 'warning',
                'message' => 'Vérification reportée car PostgreSQL est indisponible.',
            ];
        }

        $failedChecks = collect($checks)
            ->filter(fn (array $check): bool => in_array($check['status'], ['DOWN', 'DEGRADED'], true))
            ->values()
            ->all();
        $status = collect($checks)->contains(fn (array $check): bool => $check['status'] === 'DOWN')
            ? 'DOWN'
            : ($failedChecks !== [] ? 'DEGRADED' : 'OPERATIONAL');

        $health = [
            'status' => $status,
            'checkedAt' => $checkedAt->toISOString(),
            'checks' => $checks,
            'activeIncidents' => [],
            'recentIncidents' => [],
        ];

        if ($persist) {
            $this->syncIncidents($failedChecks);
            $health['activeIncidents'] = $this->incidents('ACTIVE');
            $health['recentIncidents'] = $this->incidents(null, 10);
        }

        return $health;
    }

    private function syncIncidents(array $failedChecks): void
    {
        try {
            if (! Schema::hasTable('system_health_incidents')) {
                return;
            }

            $activeKeys = [];
            foreach ($failedChecks as $check) {
                $activeKeys[] = $check['key'];
                $incident = SystemHealthIncident::query()->where('key', $check['key'])->first();
                $now = now();
                if (! $incident) {
                    SystemHealthIncident::query()->create([
                        'id' => 'health-'.Str::uuid(),
                        'key' => $check['key'],
                        'severity' => $check['severity'],
                        'status' => 'ACTIVE',
                        'title' => 'Incident de disponibilité : '.$check['label'],
                        'message' => $check['message'],
                        'details' => $check['details'] ?? [],
                        'occurrence_count' => 1,
                        'first_seen_at' => $now,
                        'last_seen_at' => $now,
                        'resolved_at' => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                    continue;
                }

                $incident->update([
                    'severity' => $check['severity'],
                    'status' => 'ACTIVE',
                    'message' => $check['message'],
                    'details' => $check['details'] ?? [],
                    'occurrence_count' => $incident->status === 'ACTIVE' ? $incident->occurrence_count + 1 : 1,
                    'first_seen_at' => $incident->status === 'ACTIVE' ? $incident->first_seen_at : $now,
                    'last_seen_at' => $now,
                    'resolved_at' => null,
                    'updated_at' => $now,
                ]);
            }

            SystemHealthIncident::query()
                ->where('status', 'ACTIVE')
                ->when($activeKeys !== [], fn ($query) => $query->whereNotIn('key', $activeKeys))
                ->update([
                    'status' => 'RESOLVED',
                    'resolved_at' => now(),
                    'updated_at' => now(),
                ]);
        } catch (Throwable $exception) {
            Log::error('La surveillance MAXIMUS n’a pas pu enregistrer un incident.', [
                'exception' => $exception->getMessage(),
            ]);
        }
    }

    private function incidents(?string $status = null, int $limit = 50): array
    {
        try {
            if (! Schema::hasTable('system_health_incidents')) {
                return [];
            }

            return SystemHealthIncident::query()
                ->when($status, fn ($query) => $query->where('status', $status))
                ->orderByDesc('last_seen_at')
                ->limit($limit)
                ->get()
                ->map(fn (SystemHealthIncident $incident): array => [
                    'id' => $incident->id,
                    'key' => $incident->key,
                    'severity' => $incident->severity,
                    'status' => $incident->status,
                    'title' => $incident->title,
                    'message' => $incident->message,
                    'details' => $incident->details ?? [],
                    'occurrenceCount' => $incident->occurrence_count,
                    'firstSeenAt' => $incident->first_seen_at?->toISOString(),
                    'lastSeenAt' => $incident->last_seen_at?->toISOString(),
                    'resolvedAt' => $incident->resolved_at?->toISOString(),
                ])
                ->values()
                ->all();
        } catch (Throwable $exception) {
            report($exception);
            return [];
        }
    }
}