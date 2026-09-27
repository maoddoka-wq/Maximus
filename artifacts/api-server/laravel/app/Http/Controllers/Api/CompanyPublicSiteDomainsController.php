<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PublicSiteDomainService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

final class CompanyPublicSiteDomainsController extends Controller
{
    public function __construct(
        private readonly PublicSiteDomainService $domains,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->companyId($request);
        if ($companyId instanceof JsonResponse) {
            return $companyId;
        }

        return response()->json(['domains' => $this->domains->forCompany($companyId)]);
    }

    public function store(Request $request): JsonResponse
    {
        $companyId = $this->companyId($request);
        if ($companyId instanceof JsonResponse) {
            return $companyId;
        }

        $input = Validator::make($request->all(), [
            'domain' => ['required', 'string', 'max:253'],
        ])->validate();
        $domain = $this->domains->normalize($input['domain']);
        if (! $domain) {
            return response()->json(['error' => 'Saisissez un nom de domaine valide, sans http:// ni chemin.'], 422);
        }
        if ($this->domains->exists($domain)) {
            return response()->json(['error' => 'Ce domaine est déjà rattaché à un site public.'], 422);
        }

        return response()->json($this->domains->create($request, $companyId, $domain), 201);
    }

    public function verify(Request $request, string $id): JsonResponse
    {
        $companyId = $this->companyId($request);
        if ($companyId instanceof JsonResponse) {
            return $companyId;
        }

        $result = $this->domains->verify($companyId, $id);
        if (! $result) {
            return response()->json(['error' => 'Domaine introuvable.'], 404);
        }
        if (! $result['verified']) {
            return response()->json([
                'error' => 'Le domaine n’est pas encore vérifié. Ajoutez l’enregistrement DNS indiqué puis réessayez.',
                'domain' => $result['domain'],
            ], 422);
        }

        return response()->json($result['domain']);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $companyId = $this->companyId($request);
        if ($companyId instanceof JsonResponse) {
            return $companyId;
        }
        if (! $this->domains->archive($companyId, $id)) {
            return response()->json(['error' => 'Domaine introuvable.'], 404);
        }

        return response()->json(['ok' => true]);
    }

    private function companyId(Request $request): string|JsonResponse
    {
        $actor = $request->attributes->get('authActor');
        $companyId = is_array($actor) && ($actor['role'] ?? null) === 'company_admin'
            ? ($actor['companyId'] ?? null)
            : null;
        if (! is_string($companyId) || $companyId === '') {
            return response()->json(['error' => 'Seul un administrateur de l’entreprise peut modifier le site public.'], 403);
        }

        return $companyId;
    }
}