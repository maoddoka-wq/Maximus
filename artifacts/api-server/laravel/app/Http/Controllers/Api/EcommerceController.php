<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\EcommerceCustomerAuth;
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
            'products' => DB::table('ecommerce_products')
                ->where('company_id', $company)
                ->where('status', '!=', 'ARCHIVED')
                ->orderByDesc('featured')
                ->orderBy('name')
                ->get()
                ->map(fn ($row) => $this->product($row))
                ->values(),
            'orders' => $this->orders($company),
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
        $existing = DB::table('ecommerce_stores')->where('company_id', $company)->where('id', '!=', 'ecommerce-store-'.$company)->where('slug', $input['slug'])->exists();
        if ($existing) {
            return response()->json(['error' => 'Ce slug de boutique est déjà utilisé.'], 422);
        }

        $row = $this->ensureStore($company);
        $storeValues = [
            'slug' => $input['slug'],
            'name' => $input['name'],
            'description' => $input['description'] ?? '',
            'status' => $input['status'],
            'currency' => $input['currency'],
            'primary_color' => $input['primaryColor'],
            'accent_color' => $input['accentColor'],
            'logo_url' => $input['logoUrl'] ?? '',
            'updated_at' => now(),
        ];
        if (DB::table('ecommerce_stores')->where('id', $row->id)->exists()) {
            DB::table('ecommerce_stores')->where('id', $row->id)->update($storeValues);
        } else {
            DB::table('ecommerce_stores')->insert(array_merge([
                'id' => $row->id,
                'company_id' => $company,
                'created_at' => now(),
            ], $storeValues));
        }

        return response()->json($this->store(DB::table('ecommerce_stores')->where('id', $row->id)->first()));
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
        $company = $this->company($request);
        if (DB::table('ecommerce_products')->where('company_id', $company)->where('sku', $input['sku'])->exists()) {
            return response()->json(['error' => 'Ce SKU existe déjà dans cette boutique.'], 422);
        }

        $row = array_merge([
            'description' => '',
            'category' => 'Général',
            'compare_at_price' => null,
            'image_url' => '',
            'featured' => false,
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
        if (! $query->exists()) {
            return response()->json(['error' => 'Produit e-commerce introuvable.'], 404);
        }
        $input = $this->productInput($request, true);
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

        $imageUrl = '/api/product-images/'.rawurlencode($company).'/'.rawurlencode(basename($path));
        DB::table('ecommerce_products')->where('id', $id)->update([
            'image_url' => $imageUrl,
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

        $path = 'ecommerce/products/'.$company.'/'.$filename;
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

    public function updateOrderStatus(Request $request, string $id): JsonResponse
    {
        if (! $this->allowed($request, 'modify', 'commandes')) {
            return $this->forbidden();
        }
        $input = Validator::make($request->all(), ['status' => ['required', 'in:'.implode(',', self::ORDER_STATUSES)]])->validate();
        $company = $this->company($request);
        $query = DB::table('ecommerce_orders')->where('id', $id)->where('company_id', $company);
        if (! $query->exists()) {
            return response()->json(['error' => 'Commande e-commerce introuvable.'], 404);
        }
        $query->update(['status' => $input['status'], 'updated_at' => now()]);

        return response()->json($this->order(DB::table('ecommerce_orders')->where('id', $id)->first()));
    }

    public function publicBootstrap(string $slug): JsonResponse
    {
        $store = DB::table('ecommerce_stores')->where('slug', $slug)->where('status', 'PUBLISHED')->first();
        if (! $store) {
            return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
        }

        return response()->json($this->publicStore($store));
    }

    public function publicBootstrapByDomain(Request $request): JsonResponse
    {
        $store = $this->publishedStoreByDomain($request->getHost());
        if (! $store) {
            return response()->json(['available' => false]);
        }

        return response()->json($this->publicStore($store));
    }

    public function createPublicDomainOrder(Request $request): JsonResponse
    {
        $store = $this->publishedStoreByDomain($request->getHost());
        if (! $store) {
            return response()->json(['error' => 'Aucune boutique publiée ne correspond à ce domaine.'], 404);
        }

        return $this->createOrderForStore($request, $store);
    }

    private function publicStore(object $store): array
    {
        return response()->json([
            'store' => $this->publicStorePayload($store),
            'products' => DB::table('ecommerce_products')
                ->where('company_id', $store->company_id)
                ->where('status', 'PUBLISHED')
                ->where('stock', '>', 0)
                ->orderByDesc('featured')
                ->orderBy('name')
                ->get()
                ->map(fn ($row) => $this->publicProduct($row))
                ->values(),
        ])->getData(true);
    }

    private function publicStorePayload(object $row): array
    {
        return [
            'slug' => $row->slug,
            'name' => $row->name,
            'description' => $row->description,
            'status' => $row->status,
            'currency' => $row->currency,
            'primaryColor' => $row->primary_color,
            'accentColor' => $row->accent_color,
            'logoUrl' => $row->logo_url,
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
        ];
    }

    public function createPublicOrder(Request $request, string $slug): JsonResponse
    {
        $store = DB::table('ecommerce_stores')->where('slug', $slug)->where('status', 'PUBLISHED')->first();
        if (! $store) {
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
            'items.*.productSlug' => ['required', 'string', 'min:2', 'max:160'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:100'],
        ])->validate();

        $customer = EcommerceCustomerAuth::customerFromRequest($request, (string) $store->company_id);
        if ($customer) {
            $input['customerName'] = $customer->name;
            $input['customerEmail'] = $customer->email;
            $input['customerPhone'] = $customer->phone;
        }
        try {
            $order = DB::transaction(function () use ($input, $store, $customer): array {
                $lines = [];
                $total = 0;
                foreach ($input['items'] as $item) {
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
                        'product_name' => $product->name,
                        'unit_price' => $product->price,
                        'quantity' => $item['quantity'],
                        'line_total' => $lineTotal,
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
                    'reference' => $reference,
                    'customer_name' => $input['customerName'],
                    'customer_email' => $input['customerEmail'],
                    'customer_phone' => $input['customerPhone'] ?? '',
                    'shipping_address' => $input['shippingAddress'],
                    'note' => $input['note'] ?? '',
                    'total' => $total,
                    'status' => 'NOUVELLE',
                    'payment_status' => 'À CONFIRMER',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                foreach ($lines as $line) {
                    DB::table('ecommerce_order_items')->insert(array_merge($line, ['order_id' => $id]));
                }

                return ['reference' => $reference, 'total' => $total];
            });

            return response()->json($order, 201);
        } catch (Throwable $error) {
            return response()->json([
                'error' => $error->getMessage() === 'STOCK_INSUFFICIENT'
                    ? 'Un article n’est plus disponible dans la quantité demandée.'
                    : 'La commande n’a pas pu être enregistrée.',
            ], $error->getMessage() === 'STOCK_INSUFFICIENT' ? 409 : 400);
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

        return DB::table('ecommerce_stores')
            ->where('company_id', $domainRow->company_id)
            ->where('status', 'PUBLISHED')
            ->first();
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
            'logoUrl' => $row->logo_url,
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
            'price' => (int) $row->price,
            'compareAtPrice' => $row->compare_at_price === null ? null : (int) $row->compare_at_price,
            'stock' => (int) $row->stock,
            'imageUrl' => $row->image_url,
            'featured' => (bool) $row->featured,
            'status' => $row->status,
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
            'paymentStatus' => $row->payment_status,
            'createdAt' => $row->created_at,
            'items' => array_map(fn ($item) => [
                'id' => $item->id,
                'productId' => $item->product_id,
                'productName' => $item->product_name,
                'unitPrice' => (int) $item->unit_price,
                'quantity' => (int) $item->quantity,
                'lineTotal' => (int) $item->line_total,
            ], $items),
        ];
    }

    private function productInput(Request $request, bool $partial = false): array
    {
        $required = $partial ? ['sometimes'] : ['required'];

        return Validator::make($request->all(), [
            'name' => array_merge($required, ['string', 'min:2', 'max:160']),
            'slug' => array_merge($required, ['string', 'min:2', 'max:160', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/']),
            'sku' => array_merge($required, ['string', 'min:1', 'max:80']),
            'description' => ['nullable', 'string', 'max:2000'],
            'category' => ['nullable', 'string', 'max:80'],
            'price' => array_merge($required, ['integer', 'min:0']),
            'compareAtPrice' => ['nullable', 'integer', 'min:0'],
            'stock' => array_merge($required, ['integer', 'min:0']),
            'imageUrl' => ['nullable', 'string', 'max:500'],
            'featured' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'in:'.implode(',', self::STATUSES)],
        ])->validate();
    }

    private function ensureStore(string $company): object
    {
        $id = 'ecommerce-store-'.$company;
        $existing = DB::table('ecommerce_stores')->where('id', $id)->first();
        if ($existing) {
            return $existing;
        }

        return (object) [
            'id' => $id,
            'company_id' => $company,
            'slug' => Str::slug($company).'-boutique',
            'name' => 'Boutique '.Str::headline($company),
            'description' => 'Découvrez notre sélection et commandez en ligne.',
            'status' => 'DRAFT',
            'currency' => 'XOF',
            'primary_color' => '#D69E2E',
            'accent_color' => '#172033',
            'logo_url' => '',
        ];
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