<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\CompanyRegistry;
use App\Support\ModuleCatalog;
use App\Support\PublicSiteRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

final class PublicSiteController extends Controller
{
    public function company(Request $request): JsonResponse
    {
        $companyId = (string) $request->attributes->get('companyId');
        if ($companyId === '') {
            return response()->json(['error' => 'Contexte entreprise requis.'], 400);
        }
        return response()->json($this->companyPayload($companyId));
    }

    public function updateCompany(Request $request): JsonResponse
    {
        $companyId = (string) $request->attributes->get('companyId');
        $actor = $request->attributes->get('authActor');
        if (($actor['role'] ?? null) !== 'company_admin') {
            return response()->json(['error' => 'Seul l’administrateur de l’entreprise peut configurer son site public.'], 403);
        }
        $input = Validator::make($request->all(), [
            'enabled' => ['required', 'boolean'],
            'moduleIds' => ['required', 'array'],
            'moduleIds.*' => ['string', 'min:1'],
        ])->validate();

        $available = PublicSiteRegistry::validModuleIds($companyId);
        $selected = array_values(array_unique(array_map('strval', $input['moduleIds'])));
        if (array_diff($selected, $available) !== []) {
            return response()->json(['error' => 'Un module sélectionné n’est pas actif ou n’est pas disponible sur le site public.'], 422);
        }
        $site = PublicSiteRegistry::site($companyId);
        if ((bool) $input['enabled'] && (! $site || ! (bool) $site->maximus_enabled)) {
            return response()->json(['error' => 'MAXIMUS doit d’abord autoriser le site public de cette entreprise.'], 403);
        }
        DB::table('company_public_sites')->updateOrInsert(
            ['company_id' => $companyId],
            [
                'company_enabled' => (bool) $input['enabled'],
                'module_ids' => json_encode($selected, JSON_UNESCAPED_UNICODE),
                'updated_at' => now(),
                'created_at' => $site?->created_at ?? now(),
            ],
        );
        return response()->json($this->companyPayload($companyId));
    }

    public function updateAccess(Request $request, string $companyId): JsonResponse
    {
        $actor = $request->attributes->get('authActor');
        if (($actor['role'] ?? null) !== 'maximus_admin') {
            return response()->json(['error' => 'Seul MAXIMUS peut autoriser un site public.'], 403);
        }
        if (! CompanyRegistry::isActive($companyId)) {
            return response()->json(['error' => 'Entreprise introuvable ou inactive.'], 404);
        }
        $enabled = Validator::make($request->all(), ['authorized' => ['required', 'boolean']])->validate()['authorized'];
        $site = PublicSiteRegistry::site($companyId);
        DB::table('company_public_sites')->updateOrInsert(
            ['company_id' => $companyId],
            [
                'maximus_enabled' => (bool) $enabled,
                'company_enabled' => $enabled ? (bool) ($site?->company_enabled ?? false) : false,
                'module_ids' => json_encode($enabled ? PublicSiteRegistry::selectedModules($companyId) : [], JSON_UNESCAPED_UNICODE),
                'updated_at' => now(),
                'created_at' => $site?->created_at ?? now(),
            ],
        );
        return response()->json(['authorized' => (bool) $enabled]);
    }

    public function access(Request $request, string $companyId): JsonResponse
    {
        $actor = $request->attributes->get('authActor');
        if (($actor['role'] ?? null) !== 'maximus_admin') {
            return response()->json(['error' => 'Seul MAXIMUS peut consulter l’autorisation du site public.'], 403);
        }
        if (! CompanyRegistry::isActive($companyId)) {
            return response()->json(['error' => 'Entreprise introuvable ou inactive.'], 404);
        }

        return response()->json([
            'authorized' => (bool) (PublicSiteRegistry::site($companyId)?->maximus_enabled ?? false),
        ]);
    }

    public function bootstrap(Request $request): JsonResponse
    {
        $domain = DB::table('ecommerce_domains')
            ->where('domain', strtolower(rtrim($request->getHost(), '.')))
            ->where('status', 'ACTIVE')
            ->whereNull('deleted_at')
            ->first();
        if (! $domain || ! CompanyRegistry::isActive((string) $domain->company_id)) {
            return $this->publicResponse(['available' => false]);
        }
        $companyId = (string) $domain->company_id;
        $store = DB::table('ecommerce_stores')
            ->where('company_id', $companyId)
            ->where('status', 'PUBLISHED')
            ->first();
        $site = PublicSiteRegistry::site($companyId);
        if (! $site || ! $site->maximus_enabled || ! $site->company_enabled) {
            return $this->publicResponse(['available' => false]);
        }
        $company = DB::table('companies')->where('id', $companyId)->first();
        return $this->publicResponse($this->publicPayload(
            $companyId,
            (string) $domain->domain,
            $company,
            $store,
        ));
    }

    public function bootstrapBySlug(string $slug): JsonResponse
    {
        $store = DB::table('ecommerce_stores')
            ->where('slug', $slug)
            ->where('status', 'PUBLISHED')
            ->first();
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            return $this->publicResponse(['available' => false]);
        }

        $companyId = (string) $store->company_id;
        $site = PublicSiteRegistry::site($companyId);
        if (! $site || ! $site->maximus_enabled || ! $site->company_enabled) {
            return $this->publicResponse(['available' => false]);
        }
        $company = DB::table('companies')->where('id', $companyId)->first();
        return $this->publicResponse($this->publicPayload($companyId, null, $company, $store));
    }

    private function companyPayload(string $companyId): array
    {
        $site = PublicSiteRegistry::site($companyId);
        $domains = DB::table('ecommerce_domains')->where('company_id', $companyId)->whereNull('deleted_at')
            ->orderBy('domain')->get(['id', 'domain', 'status'])->map(fn (object $domain): array => [
                'id' => (string) $domain->id,
                'domain' => (string) $domain->domain,
                'status' => (string) $domain->status,
            ])->values()->all();
        return [
            'authorized' => (bool) ($site?->maximus_enabled ?? false),
            'enabled' => (bool) ($site?->company_enabled ?? false),
            'moduleIds' => PublicSiteRegistry::selectedModules($companyId),
            'domains' => $domains,
            'availableModules' => PublicSiteRegistry::availableModules($companyId),
        ];
    }

    private function publicPayload(string $companyId, ?string $domain, ?object $company, ?object $store): array
    {
        $modules = collect(PublicSiteRegistry::definitions())
            ->filter(fn (array $module): bool => PublicSiteRegistry::isEnabled($companyId, $module['id']))
            ->filter(fn (array $module): bool => in_array($module['id'], PublicSiteRegistry::selectedModules($companyId), true))
            ->values()->all();
        $payload = [
            'available' => true,
            'company' => [
                'name' => (string) ($company->name ?? ''),
                'logo' => $company?->profile_photo ?: null,
                'currency' => (($store?->currency ?? '') !== '' ? (string) $store->currency : 'XOF'),
            ],
            'brand' => [
                'name' => trim((string) ($store->name ?? '')) !== ''
                    ? (string) $store->name
                    : (string) ($company->name ?? ''),
                'description' => (string) ($store->description ?? ''),
                'logoUrl' => trim((string) ($store->logo_url ?? '')) !== '' ? (string) $store->logo_url : null,
                'primaryColor' => (string) ($store->primary_color ?? ''),
                'accentColor' => (string) ($store->accent_color ?? ''),
                'heroImages' => $this->publicStoreHeroImages($companyId, $store),
            ],
            'modules' => $modules,
        ];
        if ($domain !== null) {
            $payload['domain'] = $domain;
        }
        return $payload;
    }

    private function publicStoreHeroImages(string $companyId, ?object $store): array
    {
        if (! $store || (string) ($store->status ?? '') !== 'PUBLISHED' || empty($store->id)) {
            return [];
        }

        return DB::table('ecommerce_gallery_images')
            ->where('company_id', $companyId)
            ->where('owner_type', 'store')
            ->where('owner_id', (string) $store->id)
            ->where('collection', 'hero')
            ->orderBy('sort_order')
            ->get(['id'])
            ->map(fn (object $image): string => '/api/gallery-images/'
                .rawurlencode($companyId).'/'.rawurlencode((string) $image->id))
            ->values()
            ->all();
    }

    private function publicResponse(array $payload): JsonResponse
    {
        return response()->json($payload)->header('Vary', 'Host')->header('Cache-Control', 'no-store');
    }
}