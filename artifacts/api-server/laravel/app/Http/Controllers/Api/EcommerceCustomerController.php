<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\CompanyRegistry;
use App\Support\EcommerceCustomerAuth;
use App\Support\MaximusPassword;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class EcommerceCustomerController extends Controller
{
    public function session(Request $request, ?string $slug = null): JsonResponse
    {
        $store = $this->publishedStore($request, $slug);
        if (! $store) {
            return $this->storeNotFound();
        }

        $customer = EcommerceCustomerAuth::customerFromRequest($request, $store->company_id);

        return response()->json([
            'customer' => $customer ? $this->customer($customer) : null,
        ]);
    }

    public function register(Request $request, ?string $slug = null): JsonResponse
    {
        $store = $this->publishedStore($request, $slug);
        if (! $store) {
            return $this->storeNotFound();
        }

        $input = Validator::make($request->all(), [
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['required', 'email', 'max:160'],
            'phone' => ['nullable', 'string', 'max:40'],
            'password' => ['required', 'string', 'min:8', 'max:200'],
        ])->validate();
        $email = Str::lower(trim($input['email']));

        if (DB::table('ecommerce_customers')->where('company_id', $store->company_id)->where('email', $email)->exists()) {
            return response()->json(['error' => 'Un compte existe déjà avec cette adresse email.'], 409);
        }

        $customer = (object) [
            'id' => $this->id('customer'),
            'company_id' => $store->company_id,
            'email' => $email,
            'name' => trim($input['name']),
            'phone' => trim((string) ($input['phone'] ?? '')),
            'status' => 'ACTIF',
        ];
        DB::table('ecommerce_customers')->insert([
            'id' => $customer->id,
            'company_id' => $customer->company_id,
            'email' => $customer->email,
            'name' => $customer->name,
            'phone' => $customer->phone,
            'password_hash' => MaximusPassword::hash($input['password']),
            'status' => $customer->status,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $this->withSessionCookie($customer, 201);
    }

    public function login(Request $request, ?string $slug = null): JsonResponse
    {
        $store = $this->publishedStore($request, $slug);
        if (! $store) {
            return $this->storeNotFound();
        }

        $input = Validator::make($request->all(), [
            'email' => ['required', 'email', 'max:160'],
            'password' => ['required', 'string', 'max:200'],
        ])->validate();
        $customer = DB::table('ecommerce_customers')
            ->where('company_id', $store->company_id)
            ->where('email', Str::lower(trim($input['email'])))
            ->where('status', 'ACTIF')
            ->first();

        if (! $customer || ! MaximusPassword::check($input['password'], $customer->password_hash)) {
            return response()->json(['error' => 'Email ou mot de passe incorrect.'], 422);
        }

        return $this->withSessionCookie($customer);
    }

    public function logout(Request $request): Response
    {
        EcommerceCustomerAuth::forget($request);

        return response()->noContent()->withCookie(cookie()->forget(EcommerceCustomerAuth::COOKIE));
    }

    public function bootstrap(Request $request, ?string $slug = null): JsonResponse
    {
        $store = $this->publishedStore($request, $slug);
        if (! $store) {
            return $this->storeNotFound();
        }
        $customer = $this->customerOrUnauthorized($request, $store);
        if ($customer instanceof JsonResponse) {
            return $customer;
        }

        return response()->json([
            'customer' => $this->customer($customer),
            'addresses' => $this->addresses($customer),
            'favoriteProductSlugs' => $this->favoriteProductSlugs($customer),
            'cart' => $this->cartLines($customer),
            'orders' => $this->customerOrders($customer),
        ]);
    }

    public function updateProfile(Request $request, ?string $slug = null): JsonResponse
    {
        return $this->withCustomer($request, $slug, function (object $store, object $customer) use ($request): JsonResponse {
            $input = Validator::make($request->all(), [
                'name' => ['required', 'string', 'min:2', 'max:120'],
                'phone' => ['nullable', 'string', 'max:40'],
            ])->validate();
            DB::table('ecommerce_customers')->where('id', $customer->id)->where('company_id', $store->company_id)->update([
                'name' => trim($input['name']),
                'phone' => trim((string) ($input['phone'] ?? '')),
                'updated_at' => now(),
            ]);

            return response()->json($this->customer(DB::table('ecommerce_customers')->where('id', $customer->id)->first()));
        });
    }

    public function changePassword(Request $request, ?string $slug = null): JsonResponse
    {
        return $this->withCustomer($request, $slug, function (object $store, object $customer) use ($request): JsonResponse {
            $input = Validator::make($request->all(), [
                'currentPassword' => ['required', 'string', 'max:200'],
                'newPassword' => ['required', 'string', 'min:8', 'max:200'],
            ])->validate();
            if (! MaximusPassword::check($input['currentPassword'], $customer->password_hash)) {
                return response()->json(['error' => 'Le mot de passe actuel est incorrect.'], 422);
            }
            DB::table('ecommerce_customers')->where('id', $customer->id)->where('company_id', $store->company_id)->update([
                'password_hash' => MaximusPassword::hash($input['newPassword']),
                'updated_at' => now(),
            ]);
            DB::table('ecommerce_customer_sessions')->where('customer_id', $customer->id)->delete();

            return response()->json(['ok' => true])
                ->withCookie($this->sessionCookie(EcommerceCustomerAuth::issueSession($customer)));
        });
    }

    public function listAddresses(Request $request, ?string $slug = null): JsonResponse
    {
        return $this->withCustomer($request, $slug, fn (object $store, object $customer): JsonResponse => response()->json([
            'addresses' => $this->addresses($customer),
        ]));
    }

    public function createAddress(Request $request, ?string $slug = null): JsonResponse
    {
        return $this->withCustomer($request, $slug, function (object $store, object $customer) use ($request): JsonResponse {
            $input = $this->addressInput($request);
            $address = $this->saveAddress($customer, $input);

            return response()->json($this->address($address), 201);
        });
    }

    public function updateAddress(Request $request, string $id, ?string $slug = null): JsonResponse
    {
        return $this->withCustomer($request, $slug, function (object $store, object $customer) use ($request, $id): JsonResponse {
            $existing = DB::table('ecommerce_customer_addresses')
                ->where('id', $id)
                ->where('customer_id', $customer->id)
                ->where('company_id', $store->company_id)
                ->first();
            if (! $existing) {
                return response()->json(['error' => 'Adresse introuvable.'], 404);
            }
            $input = $this->addressInput($request, true);
            $values = array_filter([
                'label' => $input['label'] ?? null,
                'recipient_name' => isset($input['recipientName']) ? trim($input['recipientName']) : null,
                'phone' => isset($input['phone']) ? trim($input['phone']) : null,
                'line1' => isset($input['line1']) ? trim($input['line1']) : null,
                'line2' => isset($input['line2']) ? trim($input['line2']) : null,
                'city' => isset($input['city']) ? trim($input['city']) : null,
                'region' => isset($input['region']) ? trim($input['region']) : null,
                'postal_code' => isset($input['postalCode']) ? trim($input['postalCode']) : null,
                'country' => isset($input['country']) ? trim($input['country']) : null,
            ], static fn ($value): bool => $value !== null);
            if (array_key_exists('isDefault', $input)) {
                $values['is_default'] = (bool) $input['isDefault'];
            }
            $this->unsetOtherDefaults($customer, $id, $values['is_default'] ?? false);
            $values['updated_at'] = now();
            DB::table('ecommerce_customer_addresses')->where('id', $id)->update($values);

            return response()->json($this->address(DB::table('ecommerce_customer_addresses')->where('id', $id)->first()));
        });
    }

    public function deleteAddress(Request $request, string $id, ?string $slug = null): JsonResponse
    {
        return $this->withCustomer($request, $slug, function (object $store, object $customer) use ($id): JsonResponse {
            $deleted = DB::table('ecommerce_customer_addresses')
                ->where('id', $id)
                ->where('customer_id', $customer->id)
                ->where('company_id', $store->company_id)
                ->delete();
            if (! $deleted) {
                return response()->json(['error' => 'Adresse introuvable.'], 404);
            }

            return response()->json(['ok' => true]);
        });
    }

    public function favorites(Request $request, ?string $slug = null): JsonResponse
    {
        return $this->withCustomer($request, $slug, fn (object $store, object $customer): JsonResponse => response()->json([
            'favoriteProductSlugs' => $this->favoriteProductSlugs($customer),
        ]));
    }

    public function toggleFavorite(Request $request, string $productSlug, ?string $slug = null): JsonResponse
    {
        return $this->withCustomer($request, $slug, function (object $store, object $customer) use ($productSlug): JsonResponse {
            $product = DB::table('ecommerce_products')
                ->where('company_id', $store->company_id)
                ->where('slug', $productSlug)
                ->where('status', 'PUBLISHED')
                ->first();
            if (! $product) {
                return response()->json(['error' => 'Produit introuvable.'], 404);
            }

            $favorite = DB::table('ecommerce_customer_favorites')
                ->where('customer_id', $customer->id)
                ->where('company_id', $store->company_id)
                ->where('product_id', $product->id);
            if ($favorite->exists()) {
                $favorite->delete();
            } else {
                DB::table('ecommerce_customer_favorites')->insert([
                    'id' => $this->id('favorite'),
                    'customer_id' => $customer->id,
                    'company_id' => $store->company_id,
                    'product_id' => $product->id,
                    'created_at' => now(),
                ]);
            }

            return response()->json(['favoriteProductSlugs' => $this->favoriteProductSlugs($customer)]);
        });
    }

    public function cart(Request $request, ?string $slug = null): JsonResponse
    {
        return $this->withCustomer($request, $slug, fn (object $store, object $customer): JsonResponse => response()->json([
            'cart' => $this->cartLines($customer),
        ]));
    }

    public function putCartItem(Request $request, ?string $slug = null): JsonResponse
    {
        return $this->withCustomer($request, $slug, function (object $store, object $customer) use ($request): JsonResponse {
            $input = Validator::make($request->all(), [
                'productSlug' => ['required', 'string', 'min:2', 'max:160'],
                'quantity' => ['required', 'integer', 'min:0', 'max:100'],
            ])->validate();
            $product = DB::table('ecommerce_products')
                ->where('company_id', $store->company_id)
                ->where('slug', $input['productSlug'])
                ->where('status', 'PUBLISHED')
                ->first();
            if (! $product) {
                return response()->json(['error' => 'Produit introuvable.'], 404);
            }
            if ((int) $input['quantity'] > (int) $product->stock) {
                return response()->json(['error' => 'La quantité demandée dépasse le stock disponible.'], 409);
            }

            $query = DB::table('ecommerce_customer_cart_items')
                ->where('customer_id', $customer->id)
                ->where('company_id', $store->company_id)
                ->where('product_id', $product->id);
            if ((int) $input['quantity'] === 0) {
                $query->delete();
            } elseif ($query->exists()) {
                $query->update(['quantity' => $input['quantity'], 'updated_at' => now()]);
            } else {
                DB::table('ecommerce_customer_cart_items')->insert([
                    'id' => $this->id('cart'),
                    'customer_id' => $customer->id,
                    'company_id' => $store->company_id,
                    'product_id' => $product->id,
                    'quantity' => $input['quantity'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return response()->json(['cart' => $this->cartLines($customer)]);
        });
    }

    public function clearCart(Request $request, ?string $slug = null): JsonResponse
    {
        return $this->withCustomer($request, $slug, function (object $store, object $customer): JsonResponse {
            DB::table('ecommerce_customer_cart_items')
                ->where('customer_id', $customer->id)
                ->where('company_id', $store->company_id)
                ->delete();

            return response()->json(['cart' => []]);
        });
    }

    public function orders(Request $request, ?string $slug = null): JsonResponse
    {
        return $this->withCustomer($request, $slug, fn (object $store, object $customer): JsonResponse => response()->json([
            'orders' => $this->customerOrders($customer),
        ]));
    }

    public function order(Request $request, string $id, ?string $slug = null): JsonResponse
    {
        return $this->withCustomer($request, $slug, function (object $store, object $customer) use ($id): JsonResponse {
            $order = DB::table('ecommerce_orders')
                ->where('id', $id)
                ->where('company_id', $store->company_id)
                ->where('customer_id', $customer->id)
                ->first();
            if (! $order) {
                return response()->json(['error' => 'Commande introuvable.'], 404);
            }

            return response()->json($this->orderPayload($order));
        });
    }

    private function withCustomer(Request $request, ?string $slug, callable $callback): JsonResponse
    {
        $store = $this->publishedStore($request, $slug);
        if (! $store) {
            return $this->storeNotFound();
        }
        $customer = $this->customerOrUnauthorized($request, $store);
        if ($customer instanceof JsonResponse) {
            return $customer;
        }

        return $callback($store, $customer);
    }

    private function customerOrUnauthorized(Request $request, object $store): object
    {
        $customer = EcommerceCustomerAuth::customerFromRequest($request, $store->company_id);

        return $customer ?: response()->json(['error' => 'Connexion client requise.'], 401);
    }

    private function publishedStore(Request $request, ?string $slug): ?object
    {
        if (is_string($slug) && $slug !== '') {
            $store = DB::table('ecommerce_stores')
                ->where('slug', $slug)
                ->where('status', 'PUBLISHED')
                ->first();
            return $store && CompanyRegistry::isActive((string) $store->company_id) ? $store : null;
        }
        $domain = $this->normalizeDomain($request->getHost());
        if (! $domain) {
            return null;
        }
        $domainRow = DB::table('ecommerce_domains')->where('domain', $domain)->where('status', 'ACTIVE')->first();
        if (! $domainRow) {
            return null;
        }

        $store = DB::table('ecommerce_stores')
            ->where('company_id', $domainRow->company_id)
            ->where('status', 'PUBLISHED')
            ->first();
        return $store && CompanyRegistry::isActive((string) $store->company_id) ? $store : null;
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

    private function addresses(object $customer): array
    {
        return DB::table('ecommerce_customer_addresses')
            ->where('customer_id', $customer->id)
            ->where('company_id', $customer->company_id)
            ->orderByDesc('is_default')
            ->orderBy('created_at')
            ->get()
            ->map(fn (object $row): array => $this->address($row))
            ->values()
            ->all();
    }

    private function address(object $row): array
    {
        return [
            'id' => $row->id,
            'label' => $row->label,
            'recipientName' => $row->recipient_name,
            'phone' => $row->phone,
            'line1' => $row->line1,
            'line2' => $row->line2,
            'city' => $row->city,
            'region' => $row->region,
            'postalCode' => $row->postal_code,
            'country' => $row->country,
            'isDefault' => (bool) $row->is_default,
        ];
    }

    private function saveAddress(object $customer, array $input): object
    {
        $isDefault = (bool) ($input['isDefault'] ?? false);
        $this->unsetOtherDefaults($customer, null, $isDefault);
        $id = $this->id('address');
        DB::table('ecommerce_customer_addresses')->insert([
            'id' => $id,
            'customer_id' => $customer->id,
            'company_id' => $customer->company_id,
            'label' => trim($input['label']),
            'recipient_name' => trim($input['recipientName']),
            'phone' => trim($input['phone']),
            'line1' => trim($input['line1']),
            'line2' => trim($input['line2'] ?? ''),
            'city' => trim($input['city']),
            'region' => trim($input['region'] ?? ''),
            'postal_code' => trim($input['postalCode'] ?? ''),
            'country' => trim($input['country'] ?? 'Sénégal'),
            'is_default' => $isDefault,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return DB::table('ecommerce_customer_addresses')->where('id', $id)->first();
    }

    private function addressInput(Request $request, bool $partial = false): array
    {
        $required = $partial ? ['sometimes'] : ['required'];

        return Validator::make($request->all(), [
            'label' => array_merge($required, ['string', 'min:2', 'max:60']),
            'recipientName' => array_merge($required, ['string', 'min:2', 'max:120']),
            'phone' => array_merge($required, ['string', 'min:4', 'max:40']),
            'line1' => array_merge($required, ['string', 'min:3', 'max:160']),
            'line2' => ['nullable', 'string', 'max:160'],
            'city' => array_merge($required, ['string', 'min:2', 'max:80']),
            'region' => ['nullable', 'string', 'max:80'],
            'postalCode' => ['nullable', 'string', 'max:30'],
            'country' => ['nullable', 'string', 'max:80'],
            'isDefault' => ['sometimes', 'boolean'],
        ])->validate();
    }

    private function unsetOtherDefaults(object $customer, ?string $exceptId, bool $enabled): void
    {
        if (! $enabled) {
            return;
        }
        $query = DB::table('ecommerce_customer_addresses')
            ->where('customer_id', $customer->id)
            ->where('company_id', $customer->company_id);
        if ($exceptId) {
            $query->where('id', '!=', $exceptId);
        }
        $query->update(['is_default' => false, 'updated_at' => now()]);
    }

    private function favoriteProductSlugs(object $customer): array
    {
        return DB::table('ecommerce_customer_favorites as favorite')
            ->join('ecommerce_products as product', 'product.id', '=', 'favorite.product_id')
            ->where('customer_id', $customer->id)
            ->where('favorite.company_id', $customer->company_id)
            ->where('product.company_id', $customer->company_id)
            ->where('product.status', 'PUBLISHED')
            ->pluck('product.slug')
            ->values()
            ->all();
    }

    private function cartLines(object $customer): array
    {
        return DB::table('ecommerce_customer_cart_items as cart')
            ->join('ecommerce_products as product', 'product.id', '=', 'cart.product_id')
            ->where('cart.customer_id', $customer->id)
            ->where('cart.company_id', $customer->company_id)
            ->where('product.company_id', $customer->company_id)
            ->where('product.status', 'PUBLISHED')
            ->orderBy('cart.created_at')
            ->get([
                'cart.product_id',
                'cart.quantity',
                'product.slug',
                'product.name',
                'product.description',
                'product.category',
                'product.price',
                'product.compare_at_price',
                'product.stock',
                'product.image_url',
            ])
            ->map(fn (object $row): array => [
                'productId' => $row->product_id,
                'productSlug' => $row->slug,
                'name' => $row->name,
                'description' => $row->description,
                'category' => $row->category,
                'price' => (int) $row->price,
                'compareAtPrice' => $row->compare_at_price === null ? null : (int) $row->compare_at_price,
                'stock' => (int) $row->stock,
                'imageUrl' => $row->image_url,
                'quantity' => (int) $row->quantity,
            ])
            ->values()
            ->all();
    }

    private function customerOrders(object $customer): array
    {
        $rows = DB::table('ecommerce_orders')
            ->where('company_id', $customer->company_id)
            ->where('customer_id', $customer->id)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return $rows->map(fn (object $row): array => $this->orderPayload($row))->values()->all();
    }

    private function orderPayload(object $row): array
    {
        $items = DB::table('ecommerce_order_items')->where('order_id', $row->id)->orderBy('created_at')->get();

        return [
            'id' => $row->id,
            'reference' => $row->reference,
            'customerName' => $row->customer_name,
            'customerEmail' => $row->customer_email,
            'customerPhone' => $row->customer_phone,
            'shippingAddress' => $row->shipping_address,
            'note' => $row->note,
            'total' => (int) $row->total,
            'status' => $row->status,
            'createdAt' => $row->created_at,
            'items' => $items->map(fn (object $item): array => [
                'id' => $item->id,
                'productId' => $item->product_id,
                'productName' => $item->product_name,
                'unitPrice' => (int) $item->unit_price,
                'quantity' => (int) $item->quantity,
                'lineTotal' => (int) $item->line_total,
            ])->values()->all(),
        ];
    }

    private function customer(object $row): array
    {
        return [
            'id' => $row->id,
            'name' => $row->name,
            'email' => $row->email,
            'phone' => $row->phone,
        ];
    }

    private function withSessionCookie(object $customer, int $status = 200): JsonResponse
    {
        $token = EcommerceCustomerAuth::issueSession($customer);

        return response()->json(['customer' => $this->customer($customer)], $status)
            ->withCookie($this->sessionCookie($token));
    }

    private function sessionCookie(string $token)
    {
        return cookie()->make(
            EcommerceCustomerAuth::COOKIE,
            $token,
            60 * 24 * 30,
            '/',
            null,
            app()->environment('production'),
            true,
            false,
            'lax',
        );
    }

    private function storeNotFound(): JsonResponse
    {
        return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
    }

    private function id(string $prefix): string
    {
        return $prefix.'-'.Str::uuid();
    }
}