<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OnboardingDraft;
use App\Services\CompanyRequestCreationService;
use App\Services\OnboardingAnalysisService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class OnboardingDraftController extends Controller
{
    public function store(Request $request, OnboardingAnalysisService $analysis): JsonResponse
    {
        $data = $request->validate([
            'description' => ['required', 'string', 'min:40', 'max:6000'],
        ]);

        try {
            $proposal = $analysis->analyze(trim($data['description']));
            $draft = OnboardingDraft::query()->create([
                'id' => (string) Str::uuid(),
                'description' => trim($data['description']),
                'proposal' => $proposal,
                'status' => 'ANALYZED',
                'expires_at' => now()->addDays(7),
            ]);

            return response()->json($this->payload($draft), 201);
        } catch (RuntimeException $exception) {
            $code = str_contains(Str::lower($exception->getMessage()), 'crédit')
                ? 'ONBOARDING_ANALYSIS_CREDITS_EXHAUSTED'
                : 'ONBOARDING_ANALYSIS_UNAVAILABLE';

            return response()->json(['error' => $exception->getMessage(), 'code' => $code], 503);
        }
    }

    public function show(string $draftId): JsonResponse
    {
        $draft = $this->findDraft($draftId);
        return response()->json($this->payload($draft));
    }

    public function update(Request $request, string $draftId, OnboardingAnalysisService $analysis): JsonResponse
    {
        $data = $request->validate([
            'description' => ['nullable', 'string', 'min:8', 'max:4000'],
            'proposal' => ['required', 'array'],
        ]);
        $draft = $this->findDraft($draftId);

        try {
            $proposal = ! empty(trim((string) ($data['description'] ?? '')))
                ? $analysis->analyze($draft->description.PHP_EOL.PHP_EOL.'Modification demandée par l’utilisateur :'.PHP_EOL.trim($data['description']))
                : $analysis->normalizeProposal($data['proposal']);

            $draft->update([
                'description' => trim($draft->description.PHP_EOL.PHP_EOL.(string) ($data['description'] ?? '')),
                'proposal' => $proposal,
                'status' => 'EDITED',
                'expires_at' => now()->addDays(7),
            ]);

            return response()->json($this->payload($draft->fresh()));
        } catch (RuntimeException $exception) {
            return response()->json(['error' => $exception->getMessage(), 'code' => 'ONBOARDING_PROPOSAL_INVALID'], 422);
        }
    }

    public function confirm(
        Request $request,
        string $draftId,
        OnboardingAnalysisService $analysis,
        CompanyRequestCreationService $companyRequests,
    ): JsonResponse {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:160'],
            'manager' => ['required', 'string', 'min:2', 'max:180'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'max:200'],
            'phone' => ['nullable', 'string', 'max:40'],
            'country' => ['nullable', 'string', 'max:100'],
            'sector' => ['nullable', 'string', 'max:120'],
        ]);

        try {
            $result = DB::transaction(function () use ($draftId, $data, $analysis, $companyRequests): array {
                $draft = OnboardingDraft::query()->whereKey($draftId)->lockForUpdate()->first();
                if (! $draft || ($draft->expires_at && $draft->expires_at->isPast())) {
                    throw new RuntimeException('Ce brouillon d’onboarding a expiré. Recommencez ou utilisez la configuration manuelle.');
                }
                if ($draft->request_id) {
                    $requestRow = \App\Models\CompanyRequest::query()->whereKey($draft->request_id)->firstOrFail();
                    return ['draft' => $draft, 'request' => $requestRow, 'company' => $requestRow->company];
                }

                $proposal = $analysis->normalizeProposal((array) $draft->proposal);
                if ($proposal['recommendedModules'] === []) {
                    throw new RuntimeException('Aucun module publié n’a pu être confirmé. Utilisez la configuration manuelle.');
                }

                $moduleIds = array_values(array_unique(array_map(
                    static fn (array $module): string => (string) $module['moduleId'],
                    $proposal['recommendedModules'],
                )));
                $packIds = [];
                $features = [];
                $permissions = [];
                foreach ($proposal['recommendedModules'] as $module) {
                    $moduleId = (string) $module['moduleId'];
                    $packIds[$moduleId] = array_values(array_unique($module['packIds'] ?? []));
                    $features[$moduleId] = array_values(array_unique($module['featureIds'] ?? []));
                    $permissions[$moduleId] = array_fill_keys($features[$moduleId], ['voir']);
                }

                $created = $companyRequests->create([
                    ...$data,
                    'sector' => trim((string) ($data['sector'] ?? '')) ?: (string) ($proposal['companyProfile']['sector'] ?? ''),
                    'requestedModules' => $moduleIds,
                    'requestedModulePackIds' => $packIds,
                    'requestedModuleFeatures' => $features,
                    'requestedModulePermissions' => $permissions,
                ]);

                $draft->update([
                    'status' => 'CONFIRMED',
                    'company_id' => $created['company']->id,
                    'request_id' => $created['request']->id,
                ]);

                return ['draft' => $draft->fresh(), 'request' => $created['request'], 'company' => $created['company']];
            });

            return response()->json([
                'ok' => true,
                'draft' => $this->payload($result['draft']),
                'requestId' => $result['request']->id,
                'status' => $result['request']->status,
            ]);
        } catch (RuntimeException $exception) {
            return response()->json(['error' => $exception->getMessage()], 422);
        }
    }

    private function findDraft(string $draftId): OnboardingDraft
    {
        $draft = OnboardingDraft::query()->find($draftId);
        if (! $draft || ($draft->expires_at && $draft->expires_at->isPast())) {
            abort(response()->json([
                'error' => 'Ce brouillon d’onboarding est introuvable ou a expiré.',
                'code' => 'ONBOARDING_DRAFT_EXPIRED',
            ], 404));
        }
        return $draft;
    }

    /** @return array<string, mixed> */
    private function payload(OnboardingDraft $draft): array
    {
        return [
            'draftId' => $draft->id,
            'status' => $draft->status,
            'proposal' => $draft->proposal,
        ];
    }
}