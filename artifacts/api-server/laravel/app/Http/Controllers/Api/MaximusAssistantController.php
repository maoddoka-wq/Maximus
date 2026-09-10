<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AnthropicAssistantService;
use App\Services\MaximusAssistantActionService;
use App\Support\ModuleCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MaximusAssistantController extends Controller
{
    public function ask(Request $request, AnthropicAssistantService $assistant): JsonResponse
    {
        $actor = $request->attributes->get('authActor');
        if (! is_array($actor) || ($actor['role'] ?? null) !== 'maximus_admin') {
            return response()->json([
                'error' => 'MAXI est réservé à l’administration principale MAXIMUS.',
                'code' => 'MAXIMUS_ADMIN_ONLY',
            ], 403);
        }

        $data = $request->validate([
            'question' => ['required', 'string', 'min:1', 'max:4000'],
            'history' => ['sometimes', 'array', 'max:8'],
            'history.*.role' => ['required', 'in:user,assistant'],
            'history.*.content' => ['required', 'string', 'max:4000'],
        ]);

        try {
            return response()->json($assistant->ask(
                trim($data['question']),
                $this->workspaceContext(),
                $data['history'] ?? [],
            ));
        } catch (\Throwable $exception) {
            report($exception);

            return response()->json([
                'error' => $exception instanceof \RuntimeException
                    ? $exception->getMessage()
                    : 'MAXI est momentanément indisponible.',
            ], 503);
        }
    }

    public function previewAction(Request $request, MaximusAssistantActionService $actions): JsonResponse
    {
        if (! $this->isMaximusAdmin($request)) {
            return $this->adminOnlyResponse();
        }

        $data = $request->validate([
            'action' => ['required', 'array'],
        ]);

        try {
            return response()->json($actions->preview($data['action']));
        } catch (\RuntimeException $exception) {
            return response()->json(['error' => $exception->getMessage()], 422);
        }
    }

    public function executeAction(Request $request, MaximusAssistantActionService $actions): JsonResponse
    {
        if (! $this->isMaximusAdmin($request)) {
            return $this->adminOnlyResponse();
        }

        $data = $request->validate([
            'confirmed' => ['required', 'accepted'],
            'action' => ['required', 'array'],
        ]);

        try {
            return response()->json($actions->execute(
                $data['action'],
                (array) $request->attributes->get('authActor'),
            ));
        } catch (\RuntimeException $exception) {
            return response()->json(['error' => $exception->getMessage()], 422);
        }
    }

    private function isMaximusAdmin(Request $request): bool
    {
        $actor = $request->attributes->get('authActor');
        return is_array($actor) && ($actor['role'] ?? null) === 'maximus_admin';
    }

    private function adminOnlyResponse(): JsonResponse
    {
        return response()->json([
            'error' => 'MAXI est réservé à l’administration principale MAXIMUS.',
            'code' => 'MAXIMUS_ADMIN_ONLY',
        ], 403);
    }

    /**
     * Build a server-side, credential-free context. The browser cannot choose
     * the tenant or widen this context because the route is MAXIMUS-admin-only.
     *
     * @return array<string, mixed>
     */
    private function workspaceContext(): array
    {
        $row = DB::table('maximus_app_states')->where('scope', 'workspace')->first();
        $payload = is_string($row?->payload)
            ? json_decode($row->payload, true)
            : ($row?->payload ?? []);
        $state = is_array($payload) ? $payload : [];

        return [
            'catalog' => [
                'modules' => collect(ModuleCatalog::definitions())->map(fn (array $module): array => [
                    'id' => $module['id'],
                    'name' => $module['name'],
                    'description' => $module['description'],
                    'features' => $module['features'],
                    'packs' => collect($module['feature_packs'] ?? [])->map(fn (array $pack): array => [
                        'id' => $pack['id'],
                        'name' => $pack['name'],
                        'description' => $pack['description'],
                        'featureIds' => $pack['feature_ids'] ?? [],
                        'permissions' => $pack['feature_permissions'] ?? [],
                    ])->values()->all(),
                    'dependencies' => $module['feature_dependencies'] ?? [],
                ])->values()->all(),
                'moduleStatuses' => $state['moduleStatuses'] ?? [],
                'removedModules' => $state['removedModules'] ?? [],
                'draft' => $this->draftSummary($state['catalogDraft'] ?? null),
            ],
            'sectorPresets' => collect($state['sectorPresets'] ?? [])->map(fn (mixed $sector): array => [
                'id' => (string) ($sector['id'] ?? ''),
                'name' => (string) ($sector['name'] ?? ''),
                'moduleIds' => is_array($sector['moduleIds'] ?? null) ? $sector['moduleIds'] : [],
                'modulePackIds' => is_array($sector['modulePackIds'] ?? null) ? $sector['modulePackIds'] : [],
            ])->values()->all(),
            'companies' => collect($state['companies'] ?? [])->map(fn (mixed $company): array => [
                'id' => (string) ($company['id'] ?? ''),
                'name' => (string) ($company['name'] ?? ''),
                'sector' => (string) ($company['sector'] ?? ''),
                'status' => (string) ($company['status'] ?? ''),
                'requestedModules' => $company['requestedModules'] ?? [],
                'allowedModules' => $company['allowedModules'] ?? [],
            ])->values()->all(),
            'employees' => collect($state['employees'] ?? [])->map(fn (mixed $employee): array => [
                'id' => (string) ($employee['id'] ?? ''),
                'name' => trim((string) (($employee['firstName'] ?? '').' '.($employee['lastName'] ?? ''))),
                'companyId' => (string) ($employee['companyId'] ?? ''),
                'role' => (string) ($employee['role'] ?? ''),
                'sectorId' => $employee['sectorId'] ?? null,
                'status' => (string) ($employee['status'] ?? ''),
            ])->values()->all(),
            'roles' => collect($state['roles'] ?? [])->map(fn (mixed $role): array => [
                'id' => (string) ($role['id'] ?? ''),
                'name' => (string) ($role['name'] ?? ''),
                'companyId' => (string) ($role['companyId'] ?? ''),
                'sectorId' => $role['sectorId'] ?? null,
                'modulePermissions' => $role['modulePermissions'] ?? [],
            ])->values()->all(),
            'organization' => collect($state['orgNodes'] ?? [])->map(fn (mixed $node): array => [
                'id' => (string) ($node['id'] ?? ''),
                'name' => (string) ($node['name'] ?? ''),
                'companyId' => (string) ($node['companyId'] ?? ''),
                'type' => (string) ($node['type'] ?? ''),
                'parentId' => $node['parentId'] ?? null,
                'moduleIds' => $node['moduleIds'] ?? [],
            ])->values()->all(),
            'subscriptions' => collect($state['subscriptions'] ?? [])->map(fn (mixed $subscription): array => [
                'id' => (string) ($subscription['id'] ?? ''),
                'companyId' => (string) ($subscription['companyId'] ?? ''),
                'status' => (string) ($subscription['status'] ?? ''),
                'moduleIds' => $subscription['moduleIds'] ?? [],
            ])->values()->all(),
        ];
    }

    /**
     * @param mixed $draft
     * @return array<string, mixed>
     */
    private function draftSummary(mixed $draft): array
    {
        if (! is_array($draft)) {
            return ['present' => false];
        }

        return [
            'present' => true,
            'catalogVersion' => $draft['catalogVersion'] ?? null,
            'moduleCount' => is_array($draft['moduleOverrides'] ?? null) ? count($draft['moduleOverrides']) : 0,
            'sectorCount' => is_array($draft['sectorPresets'] ?? null) ? count($draft['sectorPresets']) : 0,
            'hasChanges' => (bool) ($draft['hasChanges'] ?? true),
        ];
    }
}