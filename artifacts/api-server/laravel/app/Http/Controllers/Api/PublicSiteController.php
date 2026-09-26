<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\EcommerceDomainVerifier;
use App\Support\CompanyRegistry;
use App\Support\InstallationContext;
use App\Support\ModuleCatalog;
use App\Support\PublicSiteRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

final class PublicSiteController extends Controller
{
    public function __construct(
        private readonly EcommerceDomainVerifier $domainVerifier,
    ) {
    }

    public function company(Request $request): JsonResponse
    {
        $companyId = $this->companyAdminId($request);
        if ($companyId instanceof JsonResponse) {
            return $companyId;
        }
        return response()->json($this->companyPayload($companyId));
    }

    public function updateCompany(Request $request): JsonResponse
    {
        $companyId = $this->companyAdminId($request);
        if ($companyId instanceof JsonResponse) {
            return $companyId;
        }
        $input = Validator::make($request->all(), [
            'enabled' => ['required', 'boolean'],
            'moduleIds' => ['required', 'array'],
            'moduleIds.*' => ['string', 'min:1'],
            'brand' => ['required', 'array'],
            'brand.name' => ['required', 'string', 'min:2', 'max:120'],
            'brand.slug' => ['required', 'string', 'min:3', 'max:80', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
            'brand.description' => ['nullable', 'string', 'max:500'],
            'brand.primaryColor' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'brand.accentColor' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
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
        $slug = $input['brand']['slug'];
        if ($this->publicSlugTaken($slug, $companyId)) {
            return response()->json(['error' => 'Cette adresse publique est déjà utilisée par une autre entreprise.'], 422);
        }

        $brandValues = [
            'public_name' => trim($input['brand']['name']),
            'public_slug' => $slug,
            'public_description' => trim((string) ($input['brand']['description'] ?? '')),
            'primary_color' => strtoupper($input['brand']['primaryColor']),
            'accent_color' => strtoupper($input['brand']['accentColor']),
        ];
        DB::table('company_public_sites')->updateOrInsert(
            ['company_id' => $companyId],
            [
                'company_enabled' => (bool) $input['enabled'],
                'module_ids' => json_encode($selected, JSON_UNESCAPED_UNICODE),
                ...$brandValues,
                'updated_at' => now(),
                'created_at' => $site?->created_at ?? now(),
            ],
        );
        $canonicalStore = $this->canonicalStore($companyId);
        if ($canonicalStore) {
            DB::table('ecommerce_stores')->where('id', $canonicalStore->id)->update([
                'slug' => $slug,
                'updated_at' => now(),
            ]);
        }

        return response()->json($this->companyPayload($companyId));
    }

    public function uploadBrandLogo(Request $request): JsonResponse
    {
        $companyId = $this->companyAdminId($request);
        if ($companyId instanceof JsonResponse) {
            return $companyId;
        }
        $input = Validator::make($request->all(), [
            'image' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ])->validate();
        $this->ensureCompanySiteRow($companyId);
        $contents = $input['image']->get();
        if (! is_string($contents) || $contents === '') {
            return response()->json(['error' => 'Le logo n’a pas pu être lu après son envoi.'], 500);
        }

        $filename = Str::uuid()->toString().'.'.strtolower($input['image']->getClientOriginalExtension() ?: 'bin');
        $logoUrl = '/api/store-logos/'.rawurlencode($companyId).'/'.rawurlencode($filename);
        $site = PublicSiteRegistry::site($companyId);
        DB::table('company_public_sites')->updateOrInsert(
            ['company_id' => $companyId],
            [
                'logo_url' => $logoUrl,
                'logo_data' => base64_encode($contents),
                'logo_mime' => $input['image']->getMimeType() ?: 'application/octet-stream',
                'updated_at' => now(),
                'created_at' => $site?->created_at ?? now(),
            ],
        );

        return response()->json($this->companyPayload($companyId));
    }

    public function uploadHeroImages(Request $request): JsonResponse
    {
        $companyId = $this->companyAdminId($request);
        if ($companyId instanceof JsonResponse) {
            return $companyId;
        }
        $input = Validator::make($request->all(), [
            'images' => ['required', 'array', 'min:1', 'max:12'],
            'images.*' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
        ])->validate();
        $this->ensureCompanySiteRow($companyId);
        $currentCount = DB::table('ecommerce_gallery_images')
            ->where('company_id', $companyId)
            ->where('owner_type', 'company_site')
            ->where('owner_id', $companyId)
            ->where('collection', 'hero')
            ->count();
        if ($currentCount + count($input['images']) > 12) {
            return response()->json(['error' => 'Le site peut afficher un maximum de 12 images d’accueil.'], 422);
        }

        $nextOrder = (int) DB::table('ecommerce_gallery_images')
            ->where('company_id', $companyId)
            ->where('owner_type', 'company_site')
            ->where('owner_id', $companyId)
            ->where('collection', 'hero')
            ->max('sort_order') + 1;
        foreach ($input['images'] as $file) {
            $contents = $file->get();
            if (! is_string($contents) || $contents === '') {
                continue;
            }
            DB::table('ecommerce_gallery_images')->insert([
                'id' => 'gallery-'.Str::uuid(),
                'company_id' => $companyId,
                'owner_type' => 'company_site',
                'owner_id' => $companyId,
                'collection' => 'hero',
                'image_data' => base64_encode($contents),
                'image_mime' => $file->getMimeType() ?: 'application/octet-stream',
                'sort_order' => $nextOrder++,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json($this->companyPayload($companyId));
    }

    public function deleteHeroImage(Request $request, string $imageId): JsonResponse
    {
        $companyId = $this->companyAdminId($request);
        if ($companyId instanceof JsonResponse) {
            return $companyId;
        }
        $deleted = DB::table('ecommerce_gallery_images')
            ->where('id', $imageId)
            ->where('company_id', $companyId)
            ->where('owner_type', 'company_site')
            ->where('owner_id', $companyId)
            ->where('collection', 'hero')
            ->delete();
        if (! $deleted) {
            return response()->json(['error' => 'Image d’accueil introuvable.'], 404);
        }

        return response()->json($this->companyPayload($companyId));
    }

    public function createDomain(Request $request): JsonResponse
    {
        $companyId = $this->companyAdminId($request);
        if ($companyId instanceof JsonResponse) {
            return $companyId;
        }
        $input = Validator::make($request->all(), [
            'domain' => ['required', 'string', 'max:253'],
        ])->validate();
        $domain = $this->domainVerifier->normalize($input['domain']);
        if (! $domain) {
            return response()->json(['error' => 'Saisissez un nom de domaine valide, sans http:// ni chemin.'], 422);
        }
        if (DB::table('ecommerce_domains')->where('domain', $domain)->whereNull('deleted_at')->exists()) {
            return response()->json(['error' => 'Ce domaine est déjà rattaché à une entreprise.'], 422);
        }

        $row = [
            'id' => 'domain-'.Str::uuid(),
            'company_id' => $companyId,
            'domain' => $domain,
            'target_host' => $this->domainTarget($request),
            'verification_token' => 'maximus-'.Str::lower(Str::random(40)),
            'status' => 'PENDING',
            'last_error' => '',
            'verified_at' => null,
            'deleted_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ];
        DB::transaction(function () use ($domain, $row): void {
            \App\Services\InstallationAddressVerifier::lockHostname($domain);
            $centralHost = strtolower((string) parse_url((string) config('maximus.central_public_url'), PHP_URL_HOST));
            if (DB::table('maximus_installation_addresses')->where('hostname', $domain)->where('validation_method', 'public')->exists()
                || in_array($domain, InstallationContext::trustedHosts(), true)
                || $domain === $centralHost) {
                throw \Illuminate\Validation\ValidationException::withMessages(['domain' => 'Ce nom d’hôte est réservé à un accès ERP.']);
            }
            if (DB::table('ecommerce_domains')->where('domain', $domain)->whereNull('deleted_at')->exists()) {
                throw \Illuminate\Validation\ValidationException::withMessages(['domain' => 'Ce domaine est déjà rattaché à une entreprise.']);
            }
            DB::table('ecommerce_domains')->insert($row);
        });

        return response()->json($this->domainPayload((object) $row), 201);
    }

    public function verifyDomain(Request $request, string $id): JsonResponse
    {
        $companyId = $this->companyAdminId($request);
        if ($companyId instanceof JsonResponse) {
            return $companyId;
        }
        $row = DB::table('ecommerce_domains')
            ->where('id', $id)
            ->where('company_id', $companyId)
            ->whereNull('deleted_at')
            ->first();
        if (! $row) {
            return response()->json(['error' => 'Domaine introuvable.'], 404);
        }
        if (! $this->domainVerifier->hasValidDnsProof($row)) {
            DB::table('ecommerce_domains')->where('id', $row->id)->update([
                'status' => 'PENDING',
                'last_error' => 'Aucun enregistrement TXT ou CNAME correspondant n’a été trouvé.',
                'updated_at' => now(),
            ]);

            return response()->json([
                'error' => 'Le domaine n’est pas encore vérifié. Ajoutez l’enregistrement DNS indiqué puis réessayez.',
                'domain' => $this->domainPayload(DB::table('ecommerce_domains')->where('id', $row->id)->first()),
            ], 422);
        }
        DB::table('ecommerce_domains')->where('id', $row->id)->update([
            'status' => 'ACTIVE',
            'last_error' => '',
            'verified_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json($this->domainPayload(DB::table('ecommerce_domains')->where('id', $row->id)->first()));
    }

    public function deleteDomain(Request $request, string $id): JsonResponse
    {
        $companyId = $this->companyAdminId($request);
        if ($companyId instanceof JsonResponse) {
            return $companyId;
        }
        $deleted = DB::table('ecommerce_domains')
            ->where('id', $id)
            ->where('company_id', $companyId)
            ->whereNull('deleted_at')
            ->update([
                'status' => 'ARCHIVED',
                'deleted_at' => now(),
                'updated_at' => now(),
            ]);
        if (! $deleted) {
            return response()->json(['error' => 'Domaine introuvable.'], 404);
        }

        return response()->json(['ok' => true]);
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
        $domain = $this->domainVerifier->activeForHost($request->getHost());
        if (! $domain || ! CompanyRegistry::isActive((string) $domain->company_id)) {
            return $this->publicResponse(['available' => false]);
        }
        $companyId = (string) $domain->company_id;
        $store = DB::table('ecommerce_stores')
            ->where('company_id', $companyId)
            ->where('status', 'PUBLISHED')
            ->orderBy('created_at')
            ->orderBy('id')
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
        $site = DB::table('company_public_sites')->where('public_slug', $slug)->first();
        $store = null;
        if (! $site) {
            $store = DB::table('ecommerce_stores')->where('slug', $slug)->first();
            if ($store) {
                $site = PublicSiteRegistry::site((string) $store->company_id);
            }
        }
        if (! $site) {
            return $this->publicResponse(['available' => false]);
        }

        $companyId = (string) $site->company_id;
        $store ??= DB::table('ecommerce_stores')
            ->where('company_id', $companyId)
            ->where('status', 'PUBLISHED')
            ->orderBy('created_at')
            ->orderBy('id')
            ->first();
        if (! CompanyRegistry::isActive($companyId)) {
            return $this->publicResponse(['available' => false]);
        }
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
            ->orderBy('domain')->get()
            ->map(fn (object $domain): array => $this->domainPayload($domain))
            ->values()->all();
        return [
            'authorized' => (bool) ($site?->maximus_enabled ?? false),
            'enabled' => (bool) ($site?->company_enabled ?? false),
            'moduleIds' => PublicSiteRegistry::selectedModules($companyId),
            'brand' => $this->brandPayload($companyId),
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
        $brand = $this->brandPayload($companyId, $company);
        $payload = [
            'available' => true,
            'company' => [
                'name' => (string) ($company->name ?? ''),
                'logo' => $brand['logoUrl'] ?: ($company?->profile_photo ?: null),
                'currency' => (($store?->currency ?? '') !== '' ? (string) $store->currency : 'XOF'),
            ],
            'brand' => $brand,
            'modules' => $modules,
        ];
        if ($domain !== null) {
            $payload['domain'] = $domain;
        }
        return $payload;
    }

    private function brandPayload(string $companyId, ?object $company = null): array
    {
        $site = PublicSiteRegistry::site($companyId);
        $company ??= DB::table('companies')->where('id', $companyId)->first();
        $siteName = trim((string) ($site?->public_name ?? ''));
        $companyName = trim((string) ($company?->name ?? ''));
        $primaryColor = trim((string) ($site?->primary_color ?? ''));
        $accentColor = trim((string) ($site?->accent_color ?? ''));
        $slug = trim((string) ($site?->public_slug ?? ''));
        if ($slug === '') {
            $slug = Str::slug($companyName) ?: $companyId;
        }
        $logoUrl = trim((string) ($site?->logo_url ?? ''));
        if ($logoUrl === '') {
            $logoUrl = trim((string) ($company?->profile_photo ?? ''));
        }
        $description = $site?->public_description !== null
            ? (string) $site->public_description
            : '';

        return [
            'name' => $siteName !== '' ? $siteName : ($companyName !== '' ? $companyName : $companyId),
            'slug' => $slug,
            'description' => $description,
            'logoUrl' => $logoUrl !== '' ? $logoUrl : null,
            'primaryColor' => $primaryColor !== '' ? $primaryColor : '#2563EB',
            'accentColor' => $accentColor !== '' ? $accentColor : '#0F172A',
            'heroImages' => $this->publicStoreHeroImages($companyId),
        ];
    }

    private function publicStoreHeroImages(string $companyId): array
    {
        return DB::table('ecommerce_gallery_images')
            ->where('company_id', $companyId)
            ->where('owner_type', 'company_site')
            ->where('owner_id', $companyId)
            ->where('collection', 'hero')
            ->orderBy('sort_order')
            ->get(['id'])
            ->map(fn (object $image): string => '/api/gallery-images/'
                .rawurlencode($companyId).'/'.rawurlencode((string) $image->id))
            ->values()
            ->all();
    }

    private function companyAdminId(Request $request): string|JsonResponse
    {
        $companyId = (string) $request->attributes->get('companyId');
        if ($companyId === '') {
            return response()->json(['error' => 'Contexte entreprise requis.'], 400);
        }
        $actor = $request->attributes->get('authActor');
        if (($actor['role'] ?? null) !== 'company_admin') {
            return response()->json(['error' => 'Seul l’administrateur de l’entreprise peut configurer son site public.'], 403);
        }

        return $companyId;
    }

    private function publicSlugTaken(string $slug, string $companyId): bool
    {
        $canonicalStore = $this->canonicalStore($companyId);
        $storeSlugQuery = DB::table('ecommerce_stores')->where('slug', $slug);
        if ($canonicalStore) {
            $storeSlugQuery->where('id', '!=', $canonicalStore->id);
        }

        return DB::table('company_public_sites')
            ->where('public_slug', $slug)
            ->where('company_id', '!=', $companyId)
            ->exists()
            || $storeSlugQuery->exists();
    }

    private function canonicalStore(string $companyId): ?object
    {
        return DB::table('ecommerce_stores')
            ->where('company_id', $companyId)
            ->orderByRaw("CASE WHEN status = 'PUBLISHED' THEN 0 ELSE 1 END")
            ->orderBy('created_at')
            ->orderBy('id')
            ->first();
    }

    private function domainPayload(object $row): array
    {
        return [
            'id' => (string) $row->id,
            'domain' => (string) $row->domain,
            'targetHost' => (string) $row->target_host,
            'verificationName' => '_maximus-verification.'.$row->domain,
            'verificationValue' => (string) $row->verification_token,
            'status' => (string) $row->status,
            'lastError' => (string) ($row->last_error ?? ''),
            'verifiedAt' => $row->verified_at,
        ];
    }

    private function domainTarget(Request $request): string
    {
        $configured = (string) env('MAXIMUS_CUSTOM_DOMAIN_TARGET', '');
        if ($configured !== '') {
            return rtrim(Str::lower($configured), '.');
        }

        return $this->domainVerifier->normalize($request->getHost()) ?? $request->getHost();
    }

    private function ensureCompanySiteRow(string $companyId): void
    {
        if (PublicSiteRegistry::site($companyId)) {
            return;
        }
        DB::table('company_public_sites')->insert([
            'company_id' => $companyId,
            'maximus_enabled' => false,
            'company_enabled' => false,
            'module_ids' => json_encode([], JSON_UNESCAPED_UNICODE),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function publicResponse(array $payload): JsonResponse
    {
        return response()->json($payload)->header('Vary', 'Host')->header('Cache-Control', 'no-store');
    }
}