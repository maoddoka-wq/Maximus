<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\ModuleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
        DB::table('ecommerce_stores')->where('id', $row->id)->update([
            'slug' => $input['slug'],
            'name' => $input['name'],
            'description' => $input['description'] ?? '',
            'status' => $input['status'],
            'currency' => $input['currency'],
            'primary_color' => $input['primaryColor'],
            'accent_color' => $input['accentColor'],
            'logo_url' => $input['logoUrl'] ?? '',
            'updated_at' => now(),
        ]);

        return response()->json($this->store(DB::table('ecommerce_stores')->where('id', $row->id)->first()));
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

        return response()->json([
            'store' => $this->store($store),
            'products' => DB::table('ecommerce_products')
                ->where('company_id', $store->company_id)
                ->where('status', 'PUBLISHED')
                ->where('stock', '>', 0)
                ->orderByDesc('featured')
                ->orderBy('name')
                ->get()
                ->map(fn ($row) => $this->product($row))
                ->values(),
        ]);
    }

    public function createPublicOrder(Request $request, string $slug): JsonResponse
    {
        $store = DB::table('ecommerce_stores')->where('slug', $slug)->where('status', 'PUBLISHED')->first();
        if (! $store) {
            return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
        }
        $input = Validator::make($request->all(), [
            'customerName' => ['required', 'string', 'min:2', 'max:120'],
            'customerEmail' => ['required', 'email', 'max:160'],
            'customerPhone' => ['nullable', 'string', 'max:40'],
            'shippingAddress' => ['required', 'string', 'min:5', 'max:500'],
            'note' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.productId' => ['required', 'string'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:100'],
        ])->validate();

        try {
            $order = DB::transaction(function () use ($input, $store): array {
                $lines = [];
                $total = 0;
                foreach ($input['items'] as $item) {
                    $product = DB::table('ecommerce_products')
                        ->where('id', $item['productId'])
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

                return ['id' => $id, 'reference' => $reference, 'total' => $total];
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
        DB::table('ecommerce_stores')->updateOrInsert(
            ['id' => $id],
            [
                'company_id' => $company,
                'slug' => Str::slug($company).'-boutique',
                'name' => 'Boutique '.Str::headline($company),
                'description' => 'Découvrez notre sélection et commandez en ligne.',
                'status' => 'DRAFT',
                'currency' => 'XOF',
                'primary_color' => '#D69E2E',
                'accent_color' => '#172033',
                'logo_url' => '',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );

        return DB::table('ecommerce_stores')->where('id', $id)->first();
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