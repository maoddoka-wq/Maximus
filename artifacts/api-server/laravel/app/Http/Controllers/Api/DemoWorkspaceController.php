<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Support\DemoWorkspace;
use App\Support\InstallationContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class DemoWorkspaceController extends Controller
{
    public function update(Request $request, string $companyId): JsonResponse
    {
        $actor = $request->attributes->get('authActor');
        if (! is_array($actor)) {
            return response()->json(['error' => 'Acteur MAXIMUS introuvable.'], 401);
        }

        if (($actor['role'] ?? null) !== 'maximus_admin') {
            return response()->json([
                'error' => 'Seul l’administrateur MAXIMUS peut gérer le mode Démonstration.',
                'code' => 'DEMO_MODE_MAXIMUS_ONLY',
            ], 403);
        }
        if (! InstallationContext::isCentral()) {
            return response()->json([
                'error' => 'Le mode Démonstration se gère depuis l’installation centrale MAXIMUS.',
                'code' => 'CENTRAL_INSTALLATION_ONLY',
            ], 404);
        }

        $company = Company::query()
            ->whereKey($companyId)
            ->where('status', 'ACTIF')
            ->whereNull('deleted_at')
            ->first();
        if (! $company) {
            return response()->json(['error' => 'Cette entreprise n’est plus active ou n’existe pas.'], 404);
        }

        $input = $request->validate(['enabled' => ['required', 'boolean']]);
        $mode = DemoWorkspace::setEnabled($companyId, (bool) $input['enabled']);

        return response()->json([
            'ok' => true,
            'companyId' => $companyId,
            'enabled' => $mode['enabled'],
            'initialized' => $mode['initialized'],
        ]);
    }
}
