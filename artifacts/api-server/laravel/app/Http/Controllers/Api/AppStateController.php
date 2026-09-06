<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AppStateController extends Controller
{
    public function bootstrap(Request $request): JsonResponse
    {
        $actor = $request->attributes->get('authActor');
        if (!is_array($actor)) {
            return response()->json(['error' => 'Acteur MAXIMUS introuvable.'], 401);
        }

        $row = DB::table('maximus_app_states')->where('scope', 'workspace')->first();
        $payload = $row?->payload;
        $state = is_string($payload) ? json_decode($payload, true) : ($payload ?? []);

        if (!is_array($state)) {
            $state = [];
        }

        if (($actor['role'] ?? null) !== 'maximus_admin') {
            $state = $this->restrictToCompany($state, (string) ($actor['companyId'] ?? ''));
        }

        return response()->json([
            'scope' => ($actor['role'] ?? null) === 'maximus_admin'
                ? 'workspace'
                : 'company:'.((string) ($actor['companyId'] ?? '')),
            'version' => (int) ($row?->version ?? 0),
            'data' => $state,
        ]);
    }

    public function save(Request $request): JsonResponse
    {
        $actor = $request->attributes->get('authActor');
        if (!is_array($actor)) {
            return response()->json(['error' => 'Acteur MAXIMUS introuvable.'], 401);
        }

        $data = $request->validate([
            'data' => ['required', 'array'],
            'version' => ['nullable', 'integer', 'min:0'],
        ]);

        $current = DB::table('maximus_app_states')->where('scope', 'workspace')->first();
        $currentPayload = is_string($current?->payload)
            ? json_decode($current->payload, true)
            : ($current?->payload ?? []);
        $currentPayload = is_array($currentPayload) ? $currentPayload : [];

        if (($actor['role'] ?? null) !== 'maximus_admin') {
            if (!in_array($actor['role'] ?? null, ['company_admin', 'sector_manager'], true)) {
                return response()->json(['error' => 'Cet acteur ne peut pas enregistrer l’état métier global.'], 403);
            }

            $companyId = (string) ($actor['companyId'] ?? '');
            if ($companyId === '') {
                return response()->json(['error' => 'Aucune entreprise associée à cet acteur.'], 403);
            }

            $currentPayload = $this->mergeCompanyState($currentPayload, $data['data'], $companyId);
        } else {
            $currentPayload = $data['data'];
        }

        $expectedVersion = array_key_exists('version', $data) ? (int) $data['version'] : null;
        if ($current && $expectedVersion !== null && (int) $current->version !== $expectedVersion) {
            return response()->json([
                'error' => 'L’état métier a changé depuis son chargement. Rechargez la page avant de réessayer.',
                'version' => (int) $current->version,
            ], 409);
        }

        $nextVersion = ((int) ($current->version ?? 0)) + 1;
        DB::table('maximus_app_states')->updateOrInsert(
            ['scope' => 'workspace'],
            [
                'company_id' => null,
                'payload' => json_encode($currentPayload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                'version' => $nextVersion,
                'updated_at' => now(),
                'created_at' => $current?->created_at ?? now(),
            ],
        );

        return response()->json(['ok' => true, 'version' => $nextVersion]);
    }

    /**
     * Keep shared catalog settings while limiting business records to the actor's company.
     */
    private function restrictToCompany(array $state, string $companyId): array
    {
        if ($companyId === '') {
            return [];
        }

        foreach ([
            'companies',
            'employees',
            'roles',
            'orgNodes',
            'subscriptions',
            'controlTasks',
            'domainEvents',
            'auditEntries',
            'notifications',
            'products',
            'movements',
            'sales',
            'payments',
            'activities',
            'purchaseOrders',
            'supplierRecords',
        ] as $key) {
            if (!isset($state[$key]) || !is_array($state[$key])) {
                continue;
            }
            $state[$key] = array_values(array_filter(
                $state[$key],
                static fn (mixed $item): bool => is_array($item)
                    && (($item['companyId'] ?? $item['company_id'] ?? null) === $companyId),
            ));
        }

        if (isset($state['commerceStates']) && is_array($state['commerceStates'])) {
            $state['commerceStates'] = array_key_exists($companyId, $state['commerceStates'])
                ? [$companyId => $state['commerceStates'][$companyId]]
                : [];
        }

        return $state;
    }

    private function mergeCompanyState(array $current, array $incoming, string $companyId): array
    {
        foreach ($incoming as $key => $value) {
            if (!is_array($value) || !isset($current[$key]) || !is_array($current[$key])) {
                continue;
            }

            if ($key === 'commerceStates') {
                if (array_key_exists($companyId, $value)) {
                    $current[$key][$companyId] = $value[$companyId];
                }
                continue;
            }

            if (!array_is_list($value)) {
                $current[$key] = array_replace_recursive($current[$key], $value);
                continue;
            }

            $existing = collect($current[$key]);
            $incomingCompanyRecords = collect($value)->filter(
                static fn (mixed $item): bool => is_array($item)
                    && (($item['companyId'] ?? $item['company_id'] ?? null) === $companyId),
            );
            if ($incomingCompanyRecords->isEmpty()) {
                continue;
            }

            $ids = $incomingCompanyRecords->pluck('id')->filter()->all();
            $preserved = $existing->filter(
                static fn (mixed $item): bool => !is_array($item)
                    || (($item['companyId'] ?? $item['company_id'] ?? null) !== $companyId
                        && !in_array($item['id'] ?? null, $ids, true)),
            );
            $current[$key] = $preserved->concat($incomingCompanyRecords)->values()->all();
        }

        return $current;
    }
}