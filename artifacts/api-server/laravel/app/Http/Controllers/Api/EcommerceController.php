<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\EcommerceCustomerAuth;
use App\Support\CompanyRegistry;
use App\Support\ModuleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Throwable;

class EcommerceController extends Controller
{
    private const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
    private const ORDER_STATUSES = ['NOUVELLE', 'CONFIRMÉE', 'EN PRÉPARATION', 'EXPÉDIÉE', 'LIVRÉE', 'ANNULÉE'];
    private const PRODUCT_TYPES = ['SALE', 'RENTAL'];
    private const RENTAL_PERIODS = ['JOUR', 'SEMAINE', 'MOIS'];
    private const RENTAL_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
    private const DELIVERY_REQUEST_STATUSES = ['DEMANDEE', 'CONFIRMEE', 'EN_COURS', 'LIVREE', 'ANNULEE'];
    private const ORDER_TRANSITIONS = [
        'NOUVELLE' => ['NOUVELLE', 'CONFIRMÉE', 'ANNULÉE'],
        'CONFIRMÉE' => ['CONFIRMÉE', 'EN PRÉPARATION', 'ANNULÉE'],
        'EN PRÉPARATION' => ['EN PRÉPARATION', 'EXPÉDIÉE', 'ANNULÉE'],
        'EXPÉDIÉE' => ['EXPÉDIÉE', 'LIVRÉE'],
        'LIVRÉE' => ['LIVRÉE'],
        'ANNULÉE' => ['ANNULÉE'],
    ];

    public function bootstrap(Request $request): JsonResponse
    {
        if (! $this->allowed($request, 'view')) {
            return $this->forbidden();
        }

        $company = $this->company($request);
        $store = $this->ensureStore($company);

        return response()->json([
            'store' => $this->store($store),
            'domains' => $this->domains($company),
            'categories' => $this->categories($company),
            'products' => DB::table('ecommerce_products')
                ->where('company_id', $company)
                ->where('status', '!=', 'ARCHIVED')
                ->orderByDesc('featured')
                ->orderBy('name')
                ->get()
                ->map(fn ($row) => $this->product($row))
                ->values(),
            'rentals' => $this->listRentals($company, true),
            'orders' => $this->orders($company),
            'deliveryRequests' => $this->listDeliveryRequests($company),
        ]);
    }

    public function updateStore(Request $request): JsonResponse
    {
        if (! $this->allowed($request, 'modify', 'settings')) {
            return $this->forbidden();
        }

        $input = Validator::make($request->all(), [
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'slug' => ['required', 'string', 'min:3', 'max:80', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
            'description' => ['nullable', 'string', 'max:500'],
            'status' => ['required', 'in:DRAFT,PUBLISHED,SUSPENDED'],
            'currency' => ['required', 'in:XOF,EUR,USD'],
            'primaryColor' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'accentColor' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'logoUrl' => ['nullable', 'string', 'max:500'],
        ])->validate();
        $company = $this->company($request);
        $row = $this->ensureStore($company);
        $slug = $this->uniqueStoreSlug($input['slug'], (string) $row->id);
        $storeValues = [
            'slug' => $slug,
            'name' => $input['name'],
            'description' => $input['description'] ?? '',
            'status' => $input['status'],
            'currency' => $input['currency'],
            'primary_color' => $input['primaryColor'],
            'accent_color' => $input['accentColor'],
            'logo_url' => array_key_exists('logoUrl', $input) ? ($input['logoUrl'] ?? '') : ($row->logo_url ?? ''),
            'updated_at' => now(),
        ];
        if (DB::table('ecommerce_stores')->where('id', $row->id)->where('company_id', $company)->exists()) {
            DB::table('ecommerce_stores')->where('id', $row->id)->where('company_id', $company)->update($storeValues);
        } else {
            DB::table('ecommerce_stores')->insert(array_merge([
                'id' => $row->id,
                'company_id' => $company,
                'created_at' => now(),
            ], $storeValues));
        }

        return response()->json($this->store(
            DB::table('ecommerce_stores')
                ->where('id', $row->id)
                ->where('company_id', $company)
                ->first(),
        ));
    }

    public function uploadStoreLogo(Request $request): JsonResponse
    {
        if (! $this->allowed($request, 'modify', 'settings')) {
            return $this->forbidden();
        }

        $company = $this->company($request);
        $store = $this->ensureStore($company);
        $input = Validator::make($request->all(), [
            'image' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ])->validate();

        $path = $input['image']->store('ecommerce/stores/'.$company, 'public');
        if (! is_string($path) || $path === '') {
            return response()->json(['error' => 'Le logo n’a pas pu être enregistré.'], 500);
        }

        $contents = file_get_contents($input['image']->getRealPath());
        if ($contents === false) {
            return response()->json(['error' => 'Le logo n’a pas pu être lu après son envoi.'], 500);
        }

        $logoUrl = '/api/store-logos/'.rawurlencode($company).'/'.rawurlencode(basename($path));
        $logoValues = [
            'logo_url' => $logoUrl,
            'logo_data' => base64_encode($contents),
            'logo_mime' => $input['image']->getMimeType() ?: 'application/octet-stream',
            'updated_at' => now(),
        ];
        if (DB::table('ecommerce_stores')->where('id', $store->id)->exists()) {
            DB::table('ecommerce_stores')->where('id', $store->id)->update($logoValues);
        } else {
            DB::table('ecommerce_stores')->insert(array_merge([
                'id' => $store->id,
                'company_id' => $store->company_id,
                'slug' => $store->slug,
                'name' => $store->name,
                'description' => $store->description,
                'status' => $store->status,
                'currency' => $store->currency,
                'primary_color' => $store->primary_color,
                'accent_color' => $store->accent_color,
                'created_at' => now(),
            ], $logoValues));
        }
        $this->deleteStoredImage($store->logo_url ?? '', $logoUrl);

        return response()->json($this->store(DB::table('ecommerce_stores')->where('id', $store->id)->first()));
    }

    public function createCategory(Request $request): JsonResponse
    {
        if (! $this->allowed($request, 'create', 'catalogue')) {
            return $this->forbidden();
        }

        $input = Validator::make($request->all(), [
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'slug' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:300'],
            'isActive' => ['sometimes', 'boolean'],
            'sortOrder' => ['sometimes', 'integer', 'min:0', 'max:100000'],
        ])->validate();
        $company = $this->company($request);
        $slug = $this->uniqueCategorySlug((string) ($input['slug'] ?? ''), (string) $input['name'], $company);

        $row = [
            'id' => $this->id('category'),
            'company_id' => $company,
            'name' => trim($input['name']),
            'slug' => $slug,
            'description' => trim((string) ($input['description'] ?? '')),
            'is_active' => (bool) ($input['isActive'] ?? true),
            'sort_order' => (int) ($input['sortOrder'] ?? 0),
            'created_at' => now(),
            'updated_at' => now(),
        ];
        DB::table('ecommerce_categories')->insert($row);

        return response()->json($this->category((object) $row), 201);
    }

    public function updateCategory(Request $request, string $id): JsonResponse
    {
        if (! $this->allowed($request, 'modify', 'catalogue')) {
            return $this->forbidden();
        }

        $company = $this->company($request);
        $existing = DB::table('ecommerce_categories')->where('id', $id)->where('company_id', $company)->first();
        if (! $existing) {
            return response()->json(['error' => 'Catégorie introuvable.'], 404);
        }
        $input = Validator::make($request->all(), [
            'name' => ['sometimes', 'string', 'min:2', 'max:80'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:300'],
            'isActive' => ['sometimes', 'boolean'],
            'sortOrder' => ['sometimes', 'integer', 'min:0', 'max:100000'],
        ])->validate();
        $slug = array_key_exists('slug', $input)
            ? $this->uniqueCategorySlug((string) ($input['slug'] ?? ''), (string) ($input['name'] ?? $existing->name), $company, $id)
            : $existing->slug;
        $changes = [];
        if (array_key_exists('name', $input)) $changes['name'] = trim($input['name']);
        if (array_key_exists('slug', $input)) $changes['slug'] = $slug;
        if (array_key_exists('description', $input)) $changes['description'] = trim((string) ($input['description'] ?? ''));
        if (array_key_exists('isActive', $input)) $changes['is_active'] = (bool) $input['isActive'];
        if (array_key_exists('sortOrder', $input)) $changes['sort_order'] = (int) $input['sortOrder'];
        $changes['updated_at'] = now();
        DB::table('ecommerce_categories')->where('id', $id)->update($changes);

        return response()->json($this->category(DB::table('ecommerce_categories')->where('id', $id)->first()));
    }

    public function deleteCategory(Request $request, string $id): JsonResponse
    {
        if (! $this->allowed($request, 'delete', 'catalogue')) {
            return $this->forbidden();
        }

        $company = $this->company($request);
        $category = DB::table('ecommerce_categories')->where('id', $id)->where('company_id', $company)->first();
        if (! $category) {
            return response()->json(['error' => 'Catégorie introuvable.'], 404);
        }
        DB::table('ecommerce_products')->where('category_id', $id)->update([
            'category_id' => null,
            'category' => 'Général',
            'updated_at' => now(),
        ]);
        DB::table('ecommerce_categories')->where('id', $id)->delete();

        return response()->json(['ok' => true]);
    }

    public function createDomain(Request $request): JsonResponse
    {
        if (! $this->allowed($request, 'modify', 'settings')) {
            return $this->forbidden();
        }

        $input = Validator::make($request->all(), [
            'domain' => ['required', 'string', 'max:253'],
        ])->validate();
        $domain = $this->normalizeDomain($input['domain']);
        if (! $domain) {
            return response()->json(['error' => 'Saisissez un nom de domaine valide, sans http:// ni chemin.'], 422);
        }

        $company = $this->company($request);
        if (DB::table('ecommerce_domains')->where('domain', $domain)->exists()) {
            return response()->json(['error' => 'Ce domaine est déjà rattaché à une boutique.'], 422);
        }

        $row = [
            'id' => $this->id('domain'),
            'company_id' => $company,
            'domain' => $domain,
            'target_host' => $this->domainTarget($request),
            'verification_token' => 'maximus-'.Str::lower(Str::random(40)),
            'status' => 'PENDING',
            'last_error' => '',
            'verified_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ];
        DB::table('ecommerce_domains')->insert($row);

        return response()->json($this->domain((object) $row), 201);
    }

    public function verifyDomain(Request $request, string $id): JsonResponse
    {
        if (! $this->allowed($request, 'modify', 'settings')) {
            return $this->forbidden();
        }

        $row = DB::table('ecommerce_domains')
            ->where('id', $id)
            ->where('company_id', $this->company($request))
            ->first();
        if (! $row) {
            return response()->json(['error' => 'Domaine introuvable.'], 404);
        }

        $verificationName = '_maximus-verification.'.$row->domain;
        $verifiedByTxt = false;
        $verifiedByCname = false;
        if (function_exists('dns_get_record')) {
            $txtRecords = @dns_get_record($verificationName, DNS_TXT) ?: [];
            $verifiedByTxt = collect($txtRecords)->contains(
                fn (array $record): bool => trim((string) ($record['txt'] ?? '')) === $row->verification_token,
            );

            $cnameRecords = @dns_get_record($row->domain, DNS_CNAME) ?: [];
            $expectedTarget = rtrim(Str::lower($row->target_host), '.');
            $verifiedByCname = collect($cnameRecords)->contains(
                fn (array $record): bool => rtrim(Str::lower((string) ($record['target'] ?? '')), '.') === $expectedTarget,
            );
        }

        if (! $verifiedByTxt && ! $verifiedByCname) {
            DB::table('ecommerce_domains')->where('id', $row->id)->update([
                'status' => 'PENDING',
                'last_error' => 'Aucun enregistrement TXT ou CNAME correspondant n’a été trouvé.',
                'updated_at' => now(),
            ]);

            return response()->json([
                'error' => 'Le domaine n’est pas encore vérifié. Ajoutez l’enregistrement DNS indiqué puis réessayez.',
                'domain' => $this->domain(DB::table('ecommerce_domains')->where('id', $row->id)->first()),
            ], 422);
        }

        DB::table('ecommerce_domains')->where('id', $row->id)->update([
            'status' => 'ACTIVE',
            'last_error' => '',
            'verified_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json($this->domain(DB::table('ecommerce_domains')->where('id', $row->id)->first()));
    }

    public function deleteDomain(Request $request, string $id): JsonResponse
    {
        if (! $this->allowed($request, 'modify', 'settings')) {
            return $this->forbidden();
        }

        $deleted = DB::table('ecommerce_domains')
            ->where('id', $id)
            ->where('company_id', $this->company($request))
            ->delete();
        if (! $deleted) {
            return response()->json(['error' => 'Domaine introuvable.'], 404);
        }

        return response()->json(['ok' => true]);
    }

    public function createProduct(Request $request): JsonResponse
    {
        if (! $this->allowed($request, 'create', 'catalogue')) {
            return $this->forbidden();
        }

        $input = $this->productInput($request);
        $input = $this->normalizeProductType($input);
        if (array_key_exists('imageUrl', $input)) {
            $input['imageUrl'] = $input['imageUrl'] ?? '';
        }
        $company = $this->company($request);
        $input = $this->normalizeProductCategory($input, $company);
        $input = $this->requireProductCategory($input);
        $input['slug'] = $this->uniqueProductSlug(
            (string) ($input['slug'] ?? ''),
            (string) $input['name'],
            (string) $input['sku'],
            $company,
        );
        if (DB::table('ecommerce_products')->where('company_id', $company)->where('sku', $input['sku'])->exists()) {
            return response()->json(['error' => 'Ce SKU existe déjà dans cette boutique.'], 422);
        }

        $row = array_merge([
            'description' => '',
            'category' => 'Général',
            'category_id' => null,
            'compare_at_price' => null,
            'image_url' => '',
            'featured' => false,
            'product_type' => 'SALE',
            'rental_period' => null,
            'status' => 'DRAFT',
            'id' => $this->id('product'),
            'company_id' => $company,
            'created_at' => now(),
            'updated_at' => now(),
        ], $this->snake($input));
        DB::table('ecommerce_products')->insert($row);

        return response()->json($this->product((object) $row), 201);
    }

    public function updateProduct(Request $request, string $id): JsonResponse
    {
        if (! $this->allowed($request, 'modify', 'catalogue')) {
            return $this->forbidden();
        }

        $company = $this->company($request);
        $query = DB::table('ecommerce_products')->where('id', $id)->where('company_id', $company);
        $existing = $query->first();
        if (! $existing) {
            return response()->json(['error' => 'Produit e-commerce introuvable.'], 404);
        }
        $input = $this->productInput($request, true);
        $input = $this->normalizeProductType($input, true);
        if (array_key_exists('imageUrl', $input)) {
            $input['imageUrl'] = $input['imageUrl'] ?? '';
        }
        $input = $this->normalizeProductCategory($input, $company);
        $input = $this->requireProductCategory(
            $input,
            (string) ($existing->category ?? ''),
            (string) ($existing->product_type ?? 'SALE'),
        );
        if (array_key_exists('slug', $input)) {
            $input['slug'] = $this->uniqueProductSlug(
                (string) ($input['slug'] ?? ''),
                (string) ($input['name'] ?? $existing->name),
                (string) ($input['sku'] ?? $existing->sku),
                $company,
                $id,
            );
        }
        if (isset($input['sku']) && DB::table('ecommerce_products')->where('company_id', $company)->where('sku', $input['sku'])->where('id', '!=', $id)->exists()) {
            return response()->json(['error' => 'Ce SKU existe déjà dans cette boutique.'], 422);
        }
        $changes = $this->snake($input);
        $changes['updated_at'] = now();
        $query->update($changes);

        return response()->json($this->product(DB::table('ecommerce_products')->where('id', $id)->first()));
    }

    public function uploadProductImage(Request $request, string $id): JsonResponse
    {
        if (! $this->allowed($request, 'modify', 'catalogue') && ! $this->allowed($request, 'create', 'catalogue')) {
            return $this->forbidden();
        }

        $company = $this->company($request);
        $product = DB::table('ecommerce_products')
            ->where('id', $id)
            ->where('company_id', $company)
            ->first();
        if (! $product) {
            return response()->json(['error' => 'Produit e-commerce introuvable.'], 404);
        }

        $input = Validator::make($request->all(), [
            'image' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ])->validate();
        $path = $input['image']->store('ecommerce/products/'.$company, 'public');
        if (! is_string($path) || $path === '') {
            return response()->json(['error' => 'La photo n’a pas pu être enregistrée.'], 500);
        }
        $contents = file_get_contents($input['image']->getRealPath());
        if ($contents === false) {
            return response()->json(['error' => 'La photo n’a pas pu être lue après son envoi.'], 500);
        }

        $imageUrl = '/api/product-images/'.rawurlencode($company).'/'.rawurlencode(basename($path));
        DB::table('ecommerce_products')->where('id', $id)->update([
            'image_url' => $imageUrl,
            'image_data' => base64_encode($contents),
            'image_mime' => $input['image']->getMimeType() ?: 'application/octet-stream',
            'updated_at' => now(),
        ]);
        $this->deleteStoredImage($product->image_url, $imageUrl);

        return response()->json($this->product(DB::table('ecommerce_products')->where('id', $id)->first()));
    }

    public function serveProductImage(string $company, string $filename)
    {
        if (! preg_match('/^[A-Za-z0-9_-]+$/', $company) || ! preg_match('/^[A-Za-z0-9_.-]+$/', $filename)) {
            abort(404);
        }

        $imageUrl = '/api/product-images/'.$company.'/'.$filename;
        $product = DB::table('ecommerce_products')
            ->where('company_id', $company)
            ->where('image_url', $imageUrl)
            ->first(['image_data', 'image_mime']);
        if ($product && is_string($product->image_data) && $product->image_data !== '') {
            $contents = base64_decode($product->image_data, true);
            if ($contents !== false) {
                return response($contents, 200, [
                    'Content-Type' => $product->image_mime ?: 'application/octet-stream',
                    'Cache-Control' => 'public, max-age=31536000, immutable',
                ]);
            }
        }

        $path = 'ecommerce/products/'.$company.'/'.$filename;
        if (! Storage::disk('public')->exists($path)) {
            abort(404);
        }

        return response()->file(Storage::disk('public')->path($path), [
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }

    public function serveStoreLogo(string $company, string $filename)
    {
        if (! preg_match('/^[A-Za-z0-9_-]+$/', $company) || ! preg_match('/^[A-Za-z0-9_.-]+$/', $filename)) {
            abort(404);
        }

        $logoUrl = '/api/store-logos/'.$company.'/'.$filename;
        $store = DB::table('ecommerce_stores')
            ->where('company_id', $company)
            ->where('logo_url', $logoUrl)
            ->first(['logo_data', 'logo_mime']);
        if ($store && is_string($store->logo_data) && $store->logo_data !== '') {
            $contents = base64_decode($store->logo_data, true);
            if ($contents !== false) {
                return response($contents, 200, [
                    'Content-Type' => $store->logo_mime ?: 'application/octet-stream',
                    'Cache-Control' => 'public, max-age=31536000, immutable',
                ]);
            }
        }

        $path = 'ecommerce/stores/'.$company.'/'.$filename;
        if (! Storage::disk('public')->exists($path)) {
            abort(404);
        }

        return response()->file(Storage::disk('public')->path($path), [
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }

    public function archiveProduct(Request $request, string $id): JsonResponse
    {
        if (! $this->allowed($request, 'delete', 'catalogue')) {
            return $this->forbidden();
        }

        $row = DB::table('ecommerce_products')->where('id', $id)->where('company_id', $this->company($request))->first();
        if (! $row) {
            return response()->json(['error' => 'Produit e-commerce introuvable.'], 404);
        }
        DB::table('ecommerce_products')->where('id', $id)->update(['status' => 'ARCHIVED', 'updated_at' => now()]);

        return response()->json($this->product(DB::table('ecommerce_products')->where('id', $id)->first()));
    }

    public function createRental(Request $request): JsonResponse
    {
        if (! $this->allowed($request, 'create', 'location')) {
            return $this->forbidden();
        }

        $input = $this->rentalInput($request);
        $company = $this->company($request);
        $input = $this->normalizeRentalCategory($input, $company);
        $input = $this->requireRentalCategory($input);
        if (DB::table('ecommerce_rentals')->where('company_id', $company)->whereRaw('LOWER(name) = ?', [mb_strtolower(trim($input['name']))])->exists()) {
            return response()->json(['error' => 'Une location porte déjà ce nom dans cette boutique.'], 422);
        }

        $row = [
            'id' => $this->id('rental'),
            'company_id' => $company,
            'name' => trim($input['name']),
            'description' => trim((string) ($input['description'] ?? '')),
            'category' => trim((string) ($input['category'] ?? 'Général')) ?: 'Général',
            'category_id' => $input['categoryId'] ?? null,
            'image_url' => '',
            'image_data' => null,
            'image_mime' => null,
            'price' => (int) $input['price'],
            'billing_unit' => $input['billingUnit'],
            'availability' => (int) $input['availability'],
            'status' => $input['status'] ?? 'DRAFT',
            'created_at' => now(),
            'updated_at' => now(),
        ];
        DB::table('ecommerce_rentals')->insert($row);

        return response()->json($this->rental((object) $row), 201);
    }

    public function updateRental(Request $request, string $id): JsonResponse
    {
        if (! $this->allowed($request, 'modify', 'location')) {
            return $this->forbidden();
        }

        $company = $this->company($request);
        $existing = DB::table('ecommerce_rentals')->where('id', $id)->where('company_id', $company)->first();
        if (! $existing) {
            return response()->json(['error' => 'Location introuvable.'], 404);
        }

        $input = $this->rentalInput($request, true);
        $input = $this->normalizeRentalCategory($input, $company);
        $input = $this->requireRentalCategory($input, (string) ($existing->category ?? ''));
        if (array_key_exists('name', $input) && DB::table('ecommerce_rentals')
            ->where('company_id', $company)
            ->where('id', '!=', $id)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower(trim($input['name']))])
            ->exists()) {
            return response()->json(['error' => 'Une location porte déjà ce nom dans cette boutique.'], 422);
        }

        $changes = [];
        foreach (['name', 'description', 'category'] as $field) {
            if (array_key_exists($field, $input)) {
                $changes[$field] = trim((string) $input[$field]);
            }
        }
        if (array_key_exists('categoryId', $input)) $changes['category_id'] = $input['categoryId'];
        if (array_key_exists('price', $input)) $changes['price'] = (int) $input['price'];
        if (array_key_exists('billingUnit', $input)) $changes['billing_unit'] = $input['billingUnit'];
        if (array_key_exists('availability', $input)) $changes['availability'] = (int) $input['availability'];
        if (array_key_exists('status', $input)) $changes['status'] = $input['status'];
        $changes['updated_at'] = now();
        DB::table('ecommerce_rentals')->where('id', $id)->update($changes);

        return response()->json($this->rental(DB::table('ecommerce_rentals')->where('id', $id)->first()));
    }

    public function uploadRentalImage(Request $request, string $id): JsonResponse
    {
        if (! $this->allowed($request, 'modify', 'location') && ! $this->allowed($request, 'create', 'location')) {
            return $this->forbidden();
        }

        $company = $this->company($request);
        $rental = DB::table('ecommerce_rentals')
            ->where('id', $id)
            ->where('company_id', $company)
            ->first();
        if (! $rental) {
            return response()->json(['error' => 'Location introuvable.'], 404);
        }

        $input = Validator::make($request->all(), [
            'image' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ])->validate();
        $path = $input['image']->store('ecommerce/rentals/'.$company, 'public');
        if (! is_string($path) || $path === '') {
            return response()->json(['error' => 'La photo n’a pas pu être enregistrée.'], 500);
        }
        $contents = file_get_contents($input['image']->getRealPath());
        if ($contents === false) {
            return response()->json(['error' => 'La photo n’a pas pu être lue après son envoi.'], 500);
        }

        $imageUrl = '/api/rental-images/'.rawurlencode($company).'/'.rawurlencode(basename($path));
        DB::table('ecommerce_rentals')->where('id', $id)->update([
            'image_url' => $imageUrl,
            'image_data' => base64_encode($contents),
            'image_mime' => $input['image']->getMimeType() ?: 'application/octet-stream',
            'updated_at' => now(),
        ]);
        $this->deleteStoredImage($rental->image_url ?? '', $imageUrl);

        return response()->json($this->rental(DB::table('ecommerce_rentals')->where('id', $id)->first()));
    }

    public function serveRentalImage(string $company, string $filename)
    {
        if (! preg_match('/^[A-Za-z0-9_-]+$/', $company) || ! preg_match('/^[A-Za-z0-9_.-]+$/', $filename)) {
            abort(404);
        }

        $imageUrl = '/api/rental-images/'.$company.'/'.$filename;
        $rental = DB::table('ecommerce_rentals')
            ->where('company_id', $company)
            ->where('image_url', $imageUrl)
            ->first(['image_data', 'image_mime']);
        if ($rental && is_string($rental->image_data) && $rental->image_data !== '') {
            $contents = base64_decode($rental->image_data, true);
            if ($contents !== false) {
                return response($contents, 200, [
                    'Content-Type' => $rental->image_mime ?: 'application/octet-stream',
                    'Cache-Control' => 'public, max-age=31536000, immutable',
                ]);
            }
        }

        $path = 'ecommerce/rentals/'.$company.'/'.$filename;
        if (! Storage::disk('public')->exists($path)) {
            abort(404);
        }

        return response()->file(Storage::disk('public')->path($path), [
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }

    public function setRentalAvailability(Request $request, string $id): JsonResponse
    {
        if (! $this->allowed($request, 'modify', 'location')) {
            return $this->forbidden();
        }

        $input = Validator::make($request->all(), [
            'availability' => ['required', 'integer', 'min:0', 'max:1000000'],
        ])->validate();
        $company = $this->company($request);
        $updated = DB::table('ecommerce_rentals')
            ->where('id', $id)
            ->where('company_id', $company)
            ->update(['availability' => (int) $input['availability'], 'updated_at' => now()]);
        if (! $updated) {
            return response()->json(['error' => 'Location introuvable.'], 404);
        }

        return response()->json($this->rental(DB::table('ecommerce_rentals')->where('id', $id)->first()));
    }

    public function archiveRental(Request $request, string $id): JsonResponse
    {
        if (! $this->allowed($request, 'delete', 'location')) {
            return $this->forbidden();
        }

        $company = $this->company($request);
        $updated = DB::table('ecommerce_rentals')
            ->where('id', $id)
            ->where('company_id', $company)
            ->update(['status' => 'ARCHIVED', 'updated_at' => now()]);
        if (! $updated) {
            return response()->json(['error' => 'Location introuvable.'], 404);
        }

        return response()->json($this->rental(DB::table('ecommerce_rentals')->where('id', $id)->first()));
    }

    public function updateOrderStatus(Request $request, string $id): JsonResponse
    {
        if (! $this->allowed($request, 'modify', 'commandes')) {
            return $this->forbidden();
        }
        $input = Validator::make($request->all(), ['status' => ['required', 'in:'.implode(',', self::ORDER_STATUSES)]])->validate();
        $company = $this->company($request);
        $query = DB::table('ecommerce_orders')->where('id', $id)->where('company_id', $company);
        $order = $query->first();
        if (! $order) {
            return response()->json(['error' => 'Commande e-commerce introuvable.'], 404);
        }
        if (! in_array($input['status'], self::ORDER_TRANSITIONS[$order->status] ?? [], true)) {
            return response()->json(['error' => 'Cette transition de commande n’est pas autorisée.'], 422);
        }
        DB::transaction(function () use ($query, $id, $input): void {
            $locked = DB::table('ecommerce_orders')->where('id', $id)->lockForUpdate()->first();
            if (! $locked) {
                return;
            }
            DB::table('ecommerce_orders')->where('id', $id)->update(['status' => $input['status'], 'updated_at' => now()]);
            $wallet = app(\App\Http\Controllers\Api\SellerWalletController::class);
            $updated = DB::table('ecommerce_orders')->where('id', $id)->first();
            if ($input['status'] === 'LIVRÉE') {
                $wallet->releaseOrderFunds($updated);
            }
            if ($input['status'] === 'ANNULÉE') {
                if ($updated->payment_status === 'PAID') {
                    $wallet->reverseOrderFunds($updated);
                    DB::table('ecommerce_orders')->where('id', $id)->update(['payment_status' => 'REFUNDED', 'updated_at' => now()]);
                }
                if (in_array($updated->payment_status, ['PENDING', 'FAILED'], true)) {
                    $wallet->restoreOrderStock($updated);
                }
            }
        });

        return response()->json($this->order(DB::table('ecommerce_orders')->where('id', $id)->first()));
    }

    public function deliveryRequests(Request $request): JsonResponse
    {
        if (! $this->allowed($request, 'view', 'livraisons')) {
            return $this->forbidden();
        }

        return response()->json(['deliveryRequests' => $this->listDeliveryRequests($this->company($request))]);
    }

    public function updateDeliveryRequestStatus(Request $request, string $id): JsonResponse
    {
        if (! $this->allowed($request, 'modify', 'livraisons')) {
            return $this->forbidden();
        }

        $input = Validator::make($request->all(), [
            'status' => ['required', 'in:'.implode(',', self::DELIVERY_REQUEST_STATUSES)],
        ])->validate();
        $requestRow = DB::table('ecommerce_delivery_requests')
            ->where('id', $id)
            ->where('company_id', $this->company($request))
            ->first();
        if (! $requestRow) {
            return response()->json(['error' => 'Demande de livraison introuvable.'], 404);
        }

        DB::table('ecommerce_delivery_requests')->where('id', $id)->update([
            'status' => $input['status'],
            'updated_at' => now(),
        ]);

        return response()->json($this->deliveryRequest(DB::table('ecommerce_delivery_requests')->where('id', $id)->first()));
    }

    public function publicBootstrap(string $slug): JsonResponse
    {
        $store = DB::table('ecommerce_stores')
            ->where('slug', $slug)
            ->where('status', 'PUBLISHED')
            ->first();
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
        }

        return response()->json($this->publicStore($store))
            ->header('Cache-Control', 'private, no-store')
            ->header('Vary', 'Host');
    }

    public function publicBootstrapByDomain(Request $request): JsonResponse
    {
        $store = $this->publishedStoreByDomain($request->getHost());
        if (! $store) {
            return response()->json(['available' => false]);
        }

        return response()->json($this->publicStore($store))
            ->header('Cache-Control', 'private, no-store')
            ->header('Vary', 'Host');
    }

    public function publicManifest(string $slug): JsonResponse
    {
        $store = DB::table('ecommerce_stores')
            ->where('slug', $slug)
            ->where('status', 'PUBLISHED')
            ->first();
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
        }

        return $this->manifestResponse($store);
    }

    public function publicManifestByDomain(Request $request): JsonResponse
    {
        $store = $this->publishedStoreByDomain($request->getHost());
        if (! $store) {
            return response()->json(['error' => 'Aucune boutique publiée ne correspond à ce domaine.'], 404);
        }

        return $this->manifestResponse($store);
    }

    public function createPublicDomainOrder(Request $request): JsonResponse
    {
        $store = $this->publishedStoreByDomain($request->getHost());
        if (! $store) {
            return response()->json(['error' => 'Aucune boutique publiée ne correspond à ce domaine.'], 404);
        }

        return $this->createOrderForStore($request, $store);
    }

    public function createPublicDeliveryRequest(Request $request, string $slug): JsonResponse
    {
        $store = DB::table('ecommerce_stores')->where('slug', $slug)->where('status', 'PUBLISHED')->first();
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
        }

        return $this->createDeliveryRequestForStore($request, $store);
    }

    public function createPublicDomainDeliveryRequest(Request $request): JsonResponse
    {
        $store = $this->publishedStoreByDomain($request->getHost());
        if (! $store) {
            return response()->json(['error' => 'Aucune boutique publiée ne correspond à ce domaine.'], 404);
        }

        return $this->createDeliveryRequestForStore($request, $store);
    }

    private function createDeliveryRequestForStore(Request $request, object $store): JsonResponse
    {
        $features = $this->publicEnabledFeatures((string) $store->company_id);
        if (! $features['livraisons']) {
            return response()->json(['error' => 'Le service de livraison n’est pas activé pour cette boutique.'], 403);
        }

        $input = Validator::make($request->all(), [
            'requesterName' => ['required', 'string', 'min:2', 'max:120'],
            'requesterEmail' => ['required', 'email', 'max:160'],
            'requesterPhone' => ['nullable', 'string', 'max:40'],
            'address' => ['required', 'string', 'min:5', 'max:500'],
            'serviceType' => ['required', 'in:STANDARD,URGENT'],
            'desiredDate' => ['nullable', 'date', 'after_or_equal:today'],
            'note' => ['nullable', 'string', 'max:500'],
        ])->validate();
        $customer = EcommerceCustomerAuth::customerFromRequest($request, (string) $store->company_id);
        if ($customer) {
            $input['requesterName'] = $customer->name;
            $input['requesterEmail'] = $customer->email;
            $input['requesterPhone'] = $customer->phone;
        }

        $id = $this->id('delivery');
        $reference = 'LIV-'.strtoupper(Str::substr(str_replace('-', '', $id), -8));
        $row = [
            'id' => $id,
            'company_id' => $store->company_id,
            'customer_id' => $customer?->id,
            'order_id' => null,
            'reference' => $reference,
            'requester_name' => trim($input['requesterName']),
            'requester_email' => Str::lower(trim($input['requesterEmail'])),
            'requester_phone' => trim((string) ($input['requesterPhone'] ?? '')),
            'address' => trim($input['address']),
            'service_type' => $input['serviceType'],
            'desired_date' => $input['desiredDate'] ?? null,
            'note' => trim((string) ($input['note'] ?? '')),
            'status' => 'DEMANDEE',
            'created_at' => now(),
            'updated_at' => now(),
        ];
        DB::table('ecommerce_delivery_requests')->insert($row);

        return response()->json($this->deliveryRequest((object) $row), 201);
    }

    private function publicStore(object $store): array
    {
        $publishedProducts = DB::table('ecommerce_products')
            ->where('company_id', $store->company_id)
            ->where('status', 'PUBLISHED')
            ->orderByDesc('featured')
            ->orderBy('name')
            ->get();

        return response()->json([
            'store' => $this->publicStorePayload($store),
            'products' => $publishedProducts
                ->filter(fn (object $row): bool => ($row->product_type ?? 'SALE') === 'SALE')
                ->map(fn ($row) => $this->publicProduct($row))
                ->values(),
            'rentals' => collect($this->listRentals((string) $store->company_id))
                ->concat(
                    $publishedProducts
                        ->filter(fn (object $row): bool => ($row->product_type ?? 'SALE') === 'RENTAL')
                        ->map(fn ($row) => $this->publicRentalProduct($row))
                )
                ->values(),
        ])->getData(true);
    }

    private function publicStorePayload(object $row): array
    {
        $company = DB::table('companies')
            ->where('id', $row->company_id)
            ->whereNull('deleted_at')
            ->first(['name', 'email', 'phone', 'profile_photo']);

        return [
            'slug' => $row->slug,
            'name' => $row->name,
            'description' => (string) ($row->description ?? ''),
            'status' => $row->status,
            'currency' => $row->currency,
            'primaryColor' => $row->primary_color,
            'accentColor' => $row->accent_color,
            'logoUrl' => $row->logo_url ?? '',
            'seller' => [
                'name' => (string) ($company->name ?? $row->name ?? ''),
                'email' => (string) ($company->email ?? ''),
                'phone' => (string) ($company->phone ?? ''),
                'photoUrl' => (string) ($company->profile_photo ?? ''),
            ],
            'enabledFeatures' => $this->publicEnabledFeatures((string) $row->company_id),
        ];
    }

    private function manifestResponse(object $store): JsonResponse
    {
        $storeName = trim((string) $store->name);
        $logoUrl = trim((string) ($store->logo_url ?? ''));

        return response()->json([
            'name' => $storeName,
            'short_name' => Str::substr($storeName ?: 'Boutique', 0, 12),
            'description' => 'La vitrine et l’espace client de '.($storeName ?: 'cette boutique').'.',
            'start_url' => '/client-app/',
            'scope' => '/client-app/',
            'display' => 'standalone',
            'orientation' => 'portrait-primary',
            'background_color' => '#f8f5ed',
            'theme_color' => $store->accent_color ?: '#0b1b2b',
            'lang' => 'fr',
            'icons' => [[
                'src' => $logoUrl !== '' ? $logoUrl : '/admin-logo.png',
                'sizes' => '1024x1024',
                'purpose' => 'any maskable',
            ]],
        ])->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Vary', 'Host');
    }

    private function publicEnabledFeatures(string $companyId): array
    {
        $access = DB::table('maximus_company_modules')
            ->where('company_id', $companyId)
            ->where('module_id', 'ecommerce')
            ->first();
        $status = (string) ($access->status ?? 'INACTIF');
        $featureIds = $access ? json_decode($access->feature_ids ?? '[]', true) : [];
        $featureIds = is_array($featureIds) ? $featureIds : [];
        $unrestricted = $featureIds === [];
        $enabled = in_array($status, ['ACTIF', 'BETA'], true);

        return [
            'location' => $enabled && ($unrestricted || in_array('location', $featureIds, true)),
            'livraisons' => $enabled && ($unrestricted || in_array('livraisons', $featureIds, true)),
        ];
    }

    private function publicProduct(object $row): array
    {
        return [
            'slug' => $row->slug,
            'name' => $row->name,
            'description' => $row->description,
            'category' => $row->category,
            'price' => (int) $row->price,
            'compareAtPrice' => $row->compare_at_price === null ? null : (int) $row->compare_at_price,
            'stock' => (int) $row->stock,
            'imageUrl' => $row->image_url,
            'featured' => (bool) $row->featured,
            'productType' => $row->product_type ?? 'SALE',
            'rentalPeriod' => $row->rental_period,
        ];
    }

    private function listRentals(string $company, bool $includeDrafts = false): array
    {
        $query = DB::table('ecommerce_rentals')->where('company_id', $company);
        if ($includeDrafts) {
            $query->where('status', '!=', 'ARCHIVED');
        } else {
            $query->where('status', 'PUBLISHED');
        }

        return $query->orderByDesc('availability')->orderBy('name')->get()
            ->map(fn ($row) => $includeDrafts ? $this->rental($row) : $this->publicRental($row))
            ->values()
            ->all();
    }

    private function publicRental(object $row): array
    {
        return [
            'id' => $row->id,
            'name' => $row->name,
            'description' => $row->description,
            'category' => trim((string) ($row->category ?? '')) ?: 'Général',
            'categoryId' => $row->category_id ?? null,
            'imageUrl' => $row->image_url ?? '',
            'price' => (int) $row->price,
            'billingUnit' => $row->billing_unit,
            'availability' => (int) $row->availability,
            'isAvailable' => (int) $row->availability > 0,
            'createdAt' => $row->created_at,
            'updatedAt' => $row->updated_at,
        ];
    }

    private function publicRentalProduct(object $row): array
    {
        return [
            'id' => $row->id,
            'productSlug' => $row->slug,
            'name' => $row->name,
            'description' => $row->description,
            'category' => trim((string) ($row->category ?? '')) ?: 'Général',
            'categoryId' => $row->category_id ?? null,
            'imageUrl' => $row->image_url ?? '',
            'price' => (int) $row->price,
            'billingUnit' => $row->rental_period ?: 'JOUR',
            'availability' => (int) $row->stock,
            'isAvailable' => (int) $row->stock > 0,
            'createdAt' => $row->created_at,
            'updatedAt' => $row->updated_at,
        ];
    }

    private function rental(object $row): array
    {
        return [
            'id' => $row->id,
            'companyId' => $row->company_id,
            'name' => $row->name,
            'description' => $row->description,
            'category' => $row->category,
            'categoryId' => $row->category_id ?? null,
            'imageUrl' => $row->image_url ?? '',
            'price' => (int) $row->price,
            'billingUnit' => $row->billing_unit,
            'availability' => (int) $row->availability,
            'isAvailable' => (int) $row->availability > 0,
            'status' => $row->status,
            'createdAt' => $row->created_at,
            'updatedAt' => $row->updated_at,
        ];
    }

    private function rentalInput(Request $request, bool $partial = false): array
    {
        $required = $partial ? ['sometimes'] : ['required'];

        return Validator::make($request->all(), [
            'name' => array_merge($required, ['string', 'min:2', 'max:160']),
            'description' => ['nullable', 'string', 'max:2000'],
            'category' => ['nullable', 'string', 'max:80'],
            'categoryId' => ['sometimes', 'nullable', 'string', 'max:100'],
            'imageUrl' => ['sometimes', 'nullable', 'string', 'max:500'],
            'price' => array_merge($required, ['integer', 'min:0']),
            'billingUnit' => array_merge($required, ['in:'.implode(',', self::RENTAL_PERIODS)]),
            'availability' => array_merge($required, ['integer', 'min:0', 'max:1000000']),
            'status' => ['sometimes', 'in:'.implode(',', self::RENTAL_STATUSES)],
        ])->validate();
    }

    private function normalizeRentalCategory(array $input, string $company): array
    {
        if (! array_key_exists('categoryId', $input)) {
            return $input;
        }

        $categoryId = $input['categoryId'];
        if ($categoryId === null || $categoryId === '') {
            $input['categoryId'] = null;
            return $input;
        }

        $category = DB::table('ecommerce_categories')
            ->where('id', $categoryId)
            ->where('company_id', $company)
            ->where('is_active', true)
            ->first();
        if (! $category) {
            abort(response()->json(['error' => 'La catégorie sélectionnée est introuvable ou inactive.'], 422));
        }

        $input['category'] = $category->name;
        return $input;
    }

    private function requireRentalCategory(array $input, ?string $existingCategory = null): array
    {
        if (! array_key_exists('category', $input) && ! array_key_exists('categoryId', $input) && trim((string) $existingCategory) === '') {
            return $input;
        }
        $category = trim((string) ($input['category'] ?? $existingCategory ?? ''));
        if ($category === '') {
            abort(response()->json(['error' => 'Une catégorie est obligatoire pour une location.'], 422));
        }
        $input['category'] = $category;

        return $input;
    }

    private function requireProductCategory(array $input, ?string $existingCategory = null, ?string $existingType = null): array
    {
        $productType = $input['productType'] ?? ($existingType ?? 'SALE');
        if ($productType !== 'RENTAL') {
            return $input;
        }

        $category = trim((string) ($input['category'] ?? $existingCategory ?? ''));
        if ($category === '') {
            abort(response()->json(['error' => 'Une catégorie est obligatoire pour un produit de location.'], 422));
        }
        $input['category'] = $category;

        return $input;
    }

    public function createPublicOrder(Request $request, string $slug): JsonResponse
    {
        $store = DB::table('ecommerce_stores')->where('slug', $slug)->where('status', 'PUBLISHED')->first();
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
        }
        return $this->createOrderForStore($request, $store);
    }

    private function createOrderForStore(Request $request, object $store): JsonResponse
    {
        $input = Validator::make($request->all(), [
            'customerName' => ['required', 'string', 'min:2', 'max:120'],
            'customerEmail' => ['required', 'email', 'max:160'],
            'customerPhone' => ['nullable', 'string', 'max:40'],
            'shippingAddress' => ['required', 'string', 'min:5', 'max:500'],
            'note' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.productSlug' => ['nullable', 'string', 'min:2', 'max:160'],
            'items.*.rentalId' => ['nullable', 'string', 'min:2', 'max:160'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:100'],
        ])->validate();

        $customer = EcommerceCustomerAuth::customerFromRequest($request, (string) $store->company_id);
        $idempotencyKey = trim((string) ($request->header('Idempotency-Key') ?: $request->input('idempotencyKey', '')));
        if ($idempotencyKey !== '' && strlen($idempotencyKey) > 120) {
            return response()->json(['error' => 'La clé de commande est invalide.'], 422);
        }
        if ($idempotencyKey !== '') {
            $existing = DB::table('ecommerce_orders')
                ->where('company_id', $store->company_id)
                ->where('idempotency_key', $idempotencyKey)
                ->first();
            if ($existing) {
                return response()->json([
                    'id' => $existing->id,
                    'reference' => $existing->reference,
                    'total' => (int) $existing->total,
                    'paymentStatus' => $existing->payment_status ?? 'UNPAID',
                    'paymentCheckoutUrl' => $existing->payment_checkout_url ?? null,
                ]);
            }
        }
        if ($customer) {
            $input['customerName'] = $customer->name;
            $input['customerEmail'] = $customer->email;
            $input['customerPhone'] = $customer->phone;
            $cartItems = DB::table('ecommerce_customer_cart_items as cart')
                ->join('ecommerce_products as product', 'product.id', '=', 'cart.product_id')
                ->where('cart.customer_id', $customer->id)
                ->where('cart.company_id', $store->company_id)
                ->where('product.company_id', $store->company_id)
                ->where('product.status', 'PUBLISHED')
                ->orderBy('cart.created_at')
                ->get(['product.slug as productSlug', 'cart.quantity']);
            if ($cartItems->isNotEmpty() && collect($input['items'])->every(fn (array $item): bool => empty($item['rentalId']))) {
                $input['items'] = $cartItems->map(fn (object $item): array => [
                    'productSlug' => $item->productSlug,
                    'quantity' => (int) $item->quantity,
                ])->all();
            }
        }
        try {
            $order = DB::transaction(function () use ($input, $store, $customer, $idempotencyKey): array {
                $lines = [];
                $total = 0;
                foreach ($input['items'] as $item) {
                    if (! empty($item['rentalId'])) {
                        $rental = DB::table('ecommerce_rentals')
                            ->where('id', $item['rentalId'])
                            ->where('company_id', $store->company_id)
                            ->where('status', 'PUBLISHED')
                            ->lockForUpdate()
                            ->first();
                        if (! $rental) {
                            throw new \RuntimeException('RENTAL_NOT_FOUND');
                        }
                        if ((int) $rental->availability < $item['quantity']) {
                            throw new \RuntimeException('RENTAL_UNAVAILABLE');
                        }
                        $lineTotal = $rental->price * $item['quantity'];
                        $total += $lineTotal;
                        $lines[] = [
                            'id' => $this->id('order-line'),
                            'product_id' => null,
                            'rental_id' => $rental->id,
                            'product_name' => $rental->name,
                            'unit_price' => $rental->price,
                            'quantity' => $item['quantity'],
                            'line_total' => $lineTotal,
                            'product_type' => 'RENTAL',
                            'rental_period' => $rental->billing_unit,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                        DB::table('ecommerce_rentals')->where('id', $rental->id)->update([
                            'availability' => $rental->availability - $item['quantity'],
                            'updated_at' => now(),
                        ]);
                        continue;
                    }
                    if (empty($item['productSlug'])) {
                        throw new \RuntimeException('PRODUCT_NOT_FOUND');
                    }
                    $product = DB::table('ecommerce_products')
                        ->where('slug', $item['productSlug'])
                        ->where('company_id', $store->company_id)
                        ->where('status', 'PUBLISHED')
                        ->lockForUpdate()
                        ->first();
                    if (! $product) {
                        throw new \RuntimeException('PRODUCT_NOT_FOUND');
                    }
                    if ($product->stock < $item['quantity']) {
                        throw new \RuntimeException('STOCK_INSUFFICIENT');
                    }
                    $lineTotal = $product->price * $item['quantity'];
                    $total += $lineTotal;
                    $lines[] = [
                        'id' => $this->id('order-line'),
                        'product_id' => $product->id,
                        'rental_id' => null,
                        'product_name' => $product->name,
                        'unit_price' => $product->price,
                        'quantity' => $item['quantity'],
                        'line_total' => $lineTotal,
                        'product_type' => $product->product_type ?? 'SALE',
                        'rental_period' => $product->rental_period,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                    DB::table('ecommerce_products')->where('id', $product->id)->update([
                        'stock' => $product->stock - $item['quantity'],
                        'updated_at' => now(),
                    ]);
                }

                $id = $this->id('order');
                $reference = 'CMD-'.strtoupper(Str::substr(str_replace('-', '', $id), -8));
                DB::table('ecommerce_orders')->insert([
                    'id' => $id,
                    'company_id' => $store->company_id,
                    'customer_id' => $customer?->id,
                    'idempotency_key' => $idempotencyKey !== '' ? $idempotencyKey : null,
                    'reference' => $reference,
                    'customer_name' => $input['customerName'],
                    'customer_email' => $input['customerEmail'],
                    'customer_phone' => $input['customerPhone'] ?? '',
                    'shipping_address' => $input['shippingAddress'],
                    'note' => $input['note'] ?? '',
                    'total' => $total,
                    'status' => 'NOUVELLE',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                foreach ($lines as $line) {
                    DB::table('ecommerce_order_items')->insert(array_merge($line, ['order_id' => $id]));
                }
                if ($customer) {
                    DB::table('ecommerce_customer_cart_items')
                        ->where('customer_id', $customer->id)
                        ->where('company_id', $store->company_id)
                        ->delete();
                }

                return ['id' => $id, 'reference' => $reference, 'total' => $total, 'paymentStatus' => 'UNPAID'];
            });

            return response()->json($order, 201);
        } catch (Throwable $error) {
            return response()->json([
                'error' => $error->getMessage() === 'STOCK_INSUFFICIENT'
                    ? 'Un article n’est plus disponible dans la quantité demandée.'
                    : ($error->getMessage() === 'RENTAL_UNAVAILABLE'
                        ? 'Cette location n’est plus disponible dans la quantité demandée.'
                        : 'La commande n’a pas pu être enregistrée.'),
            ], in_array($error->getMessage(), ['STOCK_INSUFFICIENT', 'RENTAL_UNAVAILABLE'], true) ? 409 : 400);
        }
    }

    private function publishedStoreByDomain(string $host): ?object
    {
        $domain = $this->normalizeDomain($host);
        if (! $domain) {
            return null;
        }

        $domainRow = DB::table('ecommerce_domains')
            ->where('domain', $domain)
            ->where('status', 'ACTIVE')
            ->first();
        if (! $domainRow) {
            return null;
        }

        $store = DB::table('ecommerce_stores')
            ->where('company_id', $domainRow->company_id)
            ->where('status', 'PUBLISHED')
            ->first();
        return $store && CompanyRegistry::isActive((string) $store->company_id) ? $store : null;
    }

    private function domains(string $company): array
    {
        return DB::table('ecommerce_domains')
            ->where('company_id', $company)
            ->orderBy('domain')
            ->get()
            ->map(fn ($row) => $this->domain($row))
            ->values()
            ->all();
    }

    private function domain(object $row): array
    {
        return [
            'id' => $row->id,
            'companyId' => $row->company_id,
            'domain' => $row->domain,
            'targetHost' => $row->target_host,
            'verificationName' => '_maximus-verification.'.$row->domain,
            'verificationValue' => $row->verification_token,
            'status' => $row->status,
            'lastError' => $row->last_error,
            'verifiedAt' => $row->verified_at,
        ];
    }

    private function normalizeDomain(string $value): ?string
    {
        $domain = Str::lower(trim($value));
        $domain = preg_replace('#^https?://#', '', $domain) ?? '';
        $domain = preg_replace('#/.*$#', '', $domain) ?? '';
        $domain = preg_replace('/:\d+$/', '', $domain) ?? '';
        $domain = rtrim($domain, '.');
        if ($domain === '' || strlen($domain) > 253 || ! filter_var($domain, FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME)) {
            return null;
        }

        return $domain;
    }

    private function deleteStoredImage(?string $imageUrl, string $replacement): void
    {
        if (! is_string($imageUrl)) {
            return;
        }
        if ($imageUrl === $replacement) {
            return;
        }

        $path = str_starts_with($imageUrl, '/storage/')
            ? substr($imageUrl, strlen('/storage/'))
            : null;
        if (str_starts_with($imageUrl, '/api/product-images/')) {
            $parts = explode('/', trim($imageUrl, '/'));
            if (count($parts) === 4) {
                $path = 'ecommerce/products/'.$parts[2].'/'.$parts[3];
            }
        }
        if (str_starts_with($imageUrl, '/api/store-logos/')) {
            $parts = explode('/', trim($imageUrl, '/'));
            if (count($parts) === 4) {
                $path = 'ecommerce/stores/'.$parts[2].'/'.$parts[3];
            }
        }
        if (str_starts_with($imageUrl, '/api/rental-images/')) {
            $parts = explode('/', trim($imageUrl, '/'));
            if (count($parts) === 4) {
                $path = 'ecommerce/rentals/'.$parts[2].'/'.$parts[3];
            }
        }
        if ($path) {
            Storage::disk('public')->delete($path);
        }
    }

    private function domainTarget(Request $request): string
    {
        $configured = (string) env('MAXIMUS_CUSTOM_DOMAIN_TARGET', '');
        if ($configured !== '') {
            return rtrim(Str::lower($configured), '.');
        }

        return $this->normalizeDomain($request->getHost()) ?? $request->getHost();
    }

    private function orders(string $company): array
    {
        $rows = DB::table('ecommerce_orders')->where('company_id', $company)->orderByDesc('created_at')->limit(250)->get();
        $items = DB::table('ecommerce_order_items')->whereIn('order_id', $rows->pluck('id')->all())->get()->groupBy('order_id');

        return $rows->map(fn ($row) => $this->order($row, $items->get($row->id, collect())->values()->all()))->values()->all();
    }

    private function store(object $row): array
    {
        return [
            'id' => $row->id,
            'companyId' => $row->company_id,
            'slug' => $row->slug,
            'name' => $row->name,
            'description' => $row->description,
            'status' => $row->status,
            'currency' => $row->currency,
            'primaryColor' => $row->primary_color,
            'accentColor' => $row->accent_color,
            'logoUrl' => $row->logo_url ?? '',
        ];
    }

    private function product(object $row): array
    {
        return [
            'id' => $row->id,
            'companyId' => $row->company_id,
            'name' => $row->name,
            'slug' => $row->slug,
            'sku' => $row->sku,
            'description' => $row->description,
            'category' => $row->category,
            'categoryId' => $row->category_id ?? null,
            'price' => (int) $row->price,
            'compareAtPrice' => $row->compare_at_price === null ? null : (int) $row->compare_at_price,
            'stock' => (int) $row->stock,
            'imageUrl' => $row->image_url,
            'featured' => (bool) $row->featured,
            'status' => $row->status,
            'productType' => $row->product_type ?? 'SALE',
            'rentalPeriod' => $row->rental_period,
        ];
    }

    private function order(object $row, array $items = []): array
    {
        return [
            'id' => $row->id,
            'companyId' => $row->company_id,
            'reference' => $row->reference,
            'customerName' => $row->customer_name,
            'customerEmail' => $row->customer_email,
            'customerPhone' => $row->customer_phone,
            'shippingAddress' => $row->shipping_address,
            'note' => $row->note,
            'total' => (int) $row->total,
            'status' => $row->status,
            'paymentStatus' => $row->payment_status ?? 'UNPAID',
            'paymentCheckoutUrl' => $row->payment_checkout_url ?? null,
            'createdAt' => $row->created_at,
            'items' => array_map(fn ($item) => [
                'id' => $item->id,
                'productId' => $item->product_id,
                'productName' => $item->product_name,
                'unitPrice' => (int) $item->unit_price,
                'quantity' => (int) $item->quantity,
                'lineTotal' => (int) $item->line_total,
                'productType' => $item->product_type ?? 'SALE',
                'rentalPeriod' => $item->rental_period,
            ], $items),
        ];
    }

    private function productInput(Request $request, bool $partial = false): array
    {
        $required = $partial ? ['sometimes'] : ['required'];

        return Validator::make($request->all(), [
            'name' => array_merge($required, ['string', 'min:2', 'max:160']),
            'slug' => ['nullable', 'string', 'max:160'],
            'sku' => array_merge($required, ['string', 'min:1', 'max:80']),
            'description' => ['nullable', 'string', 'max:2000'],
            'category' => ['nullable', 'string', 'max:80'],
            'categoryId' => ['nullable', 'string', 'max:100'],
            'price' => array_merge($required, ['integer', 'min:0']),
            'compareAtPrice' => ['nullable', 'integer', 'min:0'],
            'stock' => array_merge($required, ['integer', 'min:0']),
            'imageUrl' => ['nullable', 'string', 'max:500'],
            'featured' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'in:'.implode(',', self::STATUSES)],
            'productType' => array_merge($partial ? ['sometimes'] : ['nullable'], ['in:'.implode(',', self::PRODUCT_TYPES)]),
            'rentalPeriod' => ['nullable', 'in:'.implode(',', self::RENTAL_PERIODS)],
        ])->validate();
    }

    private function normalizeProductType(array $input, bool $partial = false): array
    {
        if (! $partial && ! array_key_exists('productType', $input)) {
            $input['productType'] = 'SALE';
        }
        if (! $partial && ! array_key_exists('rentalPeriod', $input)) {
            $input['rentalPeriod'] = null;
        }
        if (array_key_exists('productType', $input) && $input['productType'] === 'SALE') {
            $input['rentalPeriod'] = null;
        }

        return $input;
    }

    private function listDeliveryRequests(string $company): array
    {
        return DB::table('ecommerce_delivery_requests')
            ->where('company_id', $company)
            ->orderByDesc('created_at')
            ->limit(250)
            ->get()
            ->map(fn ($row) => $this->deliveryRequest($row))
            ->values()
            ->all();
    }

    private function deliveryRequest(object $row): array
    {
        return [
            'id' => $row->id,
            'companyId' => $row->company_id,
            'customerId' => $row->customer_id,
            'orderId' => $row->order_id,
            'reference' => $row->reference,
            'requesterName' => $row->requester_name,
            'requesterEmail' => $row->requester_email,
            'requesterPhone' => $row->requester_phone,
            'address' => $row->address,
            'serviceType' => $row->service_type,
            'desiredDate' => $row->desired_date,
            'note' => $row->note,
            'status' => $row->status,
            'createdAt' => $row->created_at,
            'updatedAt' => $row->updated_at,
        ];
    }

    private function categories(string $company): array
    {
        return DB::table('ecommerce_categories')
            ->where('company_id', $company)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (object $row): array => $this->category($row))
            ->values()
            ->all();
    }

    private function normalizeProductCategory(array $input, string $company): array
    {
        if (! array_key_exists('categoryId', $input)) {
            return $input;
        }

        $categoryId = $input['categoryId'];
        if ($categoryId === null || $categoryId === '') {
            $input['categoryId'] = null;
            return $input;
        }

        $category = DB::table('ecommerce_categories')
            ->where('id', $categoryId)
            ->where('company_id', $company)
            ->where('is_active', true)
            ->first();
        if (! $category) {
            abort(response()->json(['error' => 'La catégorie sélectionnée est introuvable ou inactive.'], 422));
        }

        $input['category'] = $category->name;
        return $input;
    }

    private function category(object $row): array
    {
        return [
            'id' => $row->id,
            'companyId' => $row->company_id,
            'name' => $row->name,
            'slug' => $row->slug,
            'description' => $row->description,
            'isActive' => (bool) $row->is_active,
            'sortOrder' => (int) $row->sort_order,
        ];
    }

    private function categorySlug(string $value): string
    {
        return Str::slug(trim($value));
    }

    private function uniqueCategorySlug(string $requested, string $name, string $company, ?string $ignoreId = null): string
    {
        $base = $this->categorySlug($requested);
        if ($base === '') {
            $base = $this->categorySlug($name);
        }
        $base = $base !== '' ? $base : 'categorie';
        $slug = $base;
        $suffix = 2;

        while (true) {
            $query = DB::table('ecommerce_categories')
                ->where('company_id', $company)
                ->where('slug', $slug);
            if ($ignoreId !== null) {
                $query->where('id', '!=', $ignoreId);
            }
            if (! $query->exists()) {
                return $slug;
            }
            $slug = $base.'-'.$suffix;
            $suffix++;
        }
    }

    private function uniqueProductSlug(string $requested, string $name, string $sku, string $company, ?string $ignoreId = null): string
    {
        $base = Str::slug(trim($requested));
        if ($base === '') {
            $base = Str::slug(trim($name));
        }
        if ($base === '') {
            $base = Str::slug(trim($sku));
        }
        $base = $base !== '' ? $base : 'produit';
        $slug = $base;
        $suffix = 2;
        while (true) {
            $query = DB::table('ecommerce_products')
                ->where('company_id', $company)
                ->where('slug', $slug);
            if ($ignoreId !== null) {
                $query->where('id', '!=', $ignoreId);
            }
            if (! $query->exists()) {
                return $slug;
            }
            $slug = $base.'-'.$suffix;
            $suffix++;
        }
    }

    private function ensureStore(string $company): object
    {
        $existing = DB::table('ecommerce_stores')
            ->where('company_id', $company)
            ->orderBy('created_at')
            ->orderBy('id')
            ->first();
        if ($existing) {
            return $existing;
        }

        $id = 'ecommerce-store-'.$company;
        if (DB::table('ecommerce_stores')->where('id', $id)->exists()) {
            $id = $this->id('store');
        }
        $baseSlug = Str::slug($company).'-boutique';
        $slug = $baseSlug;
        $suffix = 2;
        while (DB::table('ecommerce_stores')->where('slug', $slug)->exists()) {
            $slug = $baseSlug.'-'.$suffix++;
        }

        return (object) [
            'id' => $id,
            'company_id' => $company,
            'slug' => $slug,
            'name' => 'Boutique '.Str::headline($company),
            'description' => 'Découvrez notre sélection et commandez en ligne.',
            'status' => 'DRAFT',
            'currency' => 'XOF',
            'primary_color' => '#D69E2E',
            'accent_color' => '#172033',
            'logo_url' => '',
        ];
    }

    private function uniqueStoreSlug(string $requested, string $ignoreId): string
    {
        $base = Str::slug(trim($requested));
        if ($base === '') {
            $base = 'boutique';
        }

        $slug = $base;
        $suffix = 2;
        while (DB::table('ecommerce_stores')
            ->where('slug', $slug)
            ->where('id', '!=', $ignoreId)
            ->exists()) {
            $slug = $base.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }

    private function allowed(Request $request, string $action, ?string $feature = null): bool
    {
        $actor = $request->attributes->get('authActor');

        return is_array($actor) && ModuleAuthorization::allows($actor, 'ecommerce', $action, $feature);
    }

    private function company(Request $request): string
    {
        return (string) $request->attributes->get('companyId');
    }

    private function id(string $prefix): string
    {
        return $prefix.'-'.Str::uuid();
    }

    private function snake(array $input): array
    {
        return collect($input)->mapWithKeys(fn ($value, $key) => [Str::snake($key) => $value])->all();
    }

    private function forbidden(): JsonResponse
    {
        return response()->json(['error' => 'Cette action n’est pas autorisée pour votre rôle.'], 403);
    }
}