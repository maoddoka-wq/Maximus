<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\CompanyRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CompanyPushNotificationAccessController extends Controller
{
    private const ACCESS_TABLE = 'maximus_company_push_access';

    public function show(Request $request, string $companyId): JsonResponse
    {
        if (! $this->isMaximusAdmin($request)) {
            return response()->json(['error' => 'Accès réservé à l’administration MAXIMUS.'], 403);
        }

        if (! CompanyRegistry::isActive($companyId)) {
            return response()->json(['error' => 'Entreprise introuvable ou inactive.'], 404);
        }

        return response()->json($this->settings($companyId));
    }

    public function update(Request $request, string $companyId): JsonResponse
    {
        if (! $this->isMaximusAdmin($request)) {
            return response()->json(['error' => 'Accès réservé à l’administration MAXIMUS.'], 403);
        }

        if (! CompanyRegistry::isActive($companyId)) {
            return response()->json(['error' => 'Entreprise introuvable ou inactive.'], 404);
        }

        $payload = $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);
        $user = $request->attributes->get('authUser');
        $actorId = is_object($user) && is_string($user->id ?? null) ? $user->id : null;
        $now = now();
        $values = [
            'enabled' => (bool) $payload['enabled'],
            'updated_by' => $actorId,
            'updated_at' => $now,
        ];

        DB::transaction(function () use ($companyId, $values, $now): void {
            if (DB::table(self::ACCESS_TABLE)->where('company_id', $companyId)->exists()) {
                DB::table(self::ACCESS_TABLE)->where('company_id', $companyId)->update($values);
            } else {
                DB::table(self::ACCESS_TABLE)->insert([
                    'company_id' => $companyId,
                    ...$values,
                    'created_at' => $now,
                ]);
            }

            if (Schema::hasTable('maximus_installations')
                && Schema::hasColumn('maximus_installations', 'configuration_version')) {
                DB::table('maximus_installations')
                    ->where('company_id', $companyId)
                    ->increment('configuration_version', 1, ['updated_at' => $now]);
            }
        });

        return response()->json($this->settings($companyId));
    }

    /**
     * @return array{companyId: string, enabled: bool, updatedAt: string|null}
     */
    private function settings(string $companyId): array
    {
        $row = DB::table(self::ACCESS_TABLE)->where('company_id', $companyId)->first();

        return [
            'companyId' => $companyId,
            'enabled' => $this->isEnabled($row->enabled ?? false),
            'updatedAt' => isset($row->updated_at) ? (string) $row->updated_at : null,
        ];
    }

    private function isEnabled(mixed $value): bool
    {
        return in_array($value, [true, 1, '1', 't', 'true'], true);
    }

    private function isMaximusAdmin(Request $request): bool
    {
        $user = $request->attributes->get('authUser');

        return is_object($user) && ($user->role ?? null) === 'maximus_admin';
    }
}
