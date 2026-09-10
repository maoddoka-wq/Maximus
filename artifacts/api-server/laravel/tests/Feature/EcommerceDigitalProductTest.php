<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Support\EcommerceCustomerAuth;
use App\Support\MaximusAuth;
use App\Support\MaximusPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class EcommerceDigitalProductTest extends TestCase
{
    use RefreshDatabase;

    public function test_digital_sales_need_an_explicit_grant_and_a_private_file_before_publication(): void
    {
        Storage::fake('digital');
        $request = $this->asActor();

        $request->postJson('/api/ecommerce/products?companyId=kora', [
            'name' => 'Guide interdit',
            'sku' => 'DIGITAL-FORBIDDEN',
            'price' => 2500,
            'stock' => 1,
            'fulfillmentType' => 'DIGITAL',
            'status' => 'DRAFT',
        ])->assertForbidden();

        $this->enableDigitalSales('kora');
        $product = $request->postJson('/api/ecommerce/products?companyId=kora', [
            'name' => 'Guide numérique',
            'sku' => 'DIGITAL-GUIDE',
            'price' => 2500,
            'stock' => 1,
            'fulfillmentType' => 'DIGITAL',
            'status' => 'DRAFT',
        ])->assertCreated()
            ->assertJsonPath('fulfillmentType', 'DIGITAL')
            ->assertJsonPath('status', 'DRAFT')
            ->json();

        $request->post('/api/ecommerce/products/'.$product['id'].'/digital-file?companyId=kora', [
            'file' => UploadedFile::fake()->create('guide.pdf', 10, 'application/pdf'),
        ])->assertOk()
            ->assertJsonPath('digitalFile.name', 'guide.pdf');

        $request->patchJson('/api/ecommerce/products/'.$product['id'].'?companyId=kora', [
            'status' => 'PUBLISHED',
        ])->assertOk();

        $this->assertDatabaseHas('ecommerce_products', [
            'id' => $product['id'],
            'fulfillment_type' => 'DIGITAL',
            'digital_file_name' => 'guide.pdf',
            'stock' => 1,
            'status' => 'PUBLISHED',
        ]);
    }

    public function test_digital_files_accept_video_audio_pdf_word_and_powerpoint_formats(): void
    {
        Storage::fake('digital');
        $request = $this->asActor();
        $this->enableDigitalSales('kora');

        $product = $request->postJson('/api/ecommerce/products?companyId=kora', [
            'name' => 'Médiathèque numérique',
            'sku' => 'DIGITAL-MEDIA',
            'price' => 2500,
            'stock' => 1,
            'fulfillmentType' => 'DIGITAL',
            'status' => 'DRAFT',
        ])->assertCreated()->json();

        foreach ([
            ['video.mp4', 'video/mp4'],
            ['video.mov', 'video/quicktime'],
            ['audio.mp3', 'audio/mpeg'],
            ['audio.wav', 'audio/wav'],
            ['document.pdf', 'application/pdf'],
            ['document.doc', 'application/msword'],
            ['document.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            ['presentation.ppt', 'application/vnd.ms-powerpoint'],
            ['presentation.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
        ] as [$name, $mime]) {
            $request->post('/api/ecommerce/products/'.$product['id'].'/digital-file?companyId=kora', [
                'file' => UploadedFile::fake()->create($name, 10, $mime),
            ])->assertOk()->assertJsonPath('digitalFile.name', $name);
        }

        $request->postJson('/api/ecommerce/products/'.$product['id'].'/digital-file?companyId=kora', [
            'file' => UploadedFile::fake()->create('programme.exe', 10, 'application/octet-stream'),
        ])->assertUnprocessable();
    }

    public function test_digital_orders_do_not_consume_physical_stock_and_download_is_paid_customer_bound(): void
    {
        Storage::fake('digital');
        $this->createStore('kora', 'digital-shop');
        $this->enableDigitalSales('kora');
        $physicalId = $this->createProduct('kora', 'physical-book', 'PHYSICAL', 2);
        $digitalId = $this->createProduct('kora', 'digital-book', 'DIGITAL', 1, 'digital/kora/digital-book.pdf');
        Storage::disk('digital')->put('digital/kora/digital-book.pdf', 'digital content');

        $customer = $this->createCustomer('digital-customer', 'kora', 'digital@example.test');
        $otherCustomer = $this->createCustomer('other-digital-customer', 'kora', 'other-digital@example.test');
        $token = EcommerceCustomerAuth::issueSession($customer);

        $order = $this->withCredentials()->withUnencryptedCookie(EcommerceCustomerAuth::COOKIE, $token)
            ->postJson('/api/shop/digital-shop/orders', [
                'customerName' => 'Client numérique',
                'customerEmail' => 'digital@example.test',
                'shippingAddress' => 'Dakar',
                'items' => [
                    ['productSlug' => 'physical-book', 'quantity' => 1],
                    ['productSlug' => 'digital-book', 'quantity' => 1],
                ],
            ])->assertCreated()->json();

        $this->assertDatabaseHas('ecommerce_products', ['id' => $physicalId, 'stock' => 1]);
        $this->assertDatabaseHas('ecommerce_products', ['id' => $digitalId, 'stock' => 1]);
        $itemId = (string) DB::table('ecommerce_order_items')
            ->where('order_id', $order['id'])
            ->where('fulfillment_type', 'DIGITAL')
            ->value('id');
        $this->assertNotSame('', $itemId);
        $this->assertDatabaseHas('ecommerce_orders', [
            'id' => $order['id'],
            'customer_id' => $customer->id,
        ]);
        $this->assertDatabaseHas('ecommerce_order_items', [
            'id' => $itemId,
            'order_id' => $order['id'],
            'fulfillment_type' => 'DIGITAL',
        ]);

        $this->withCredentials()->withUnencryptedCookie(EcommerceCustomerAuth::COOKIE, $token)
            ->get('/api/shop/digital-shop/customer/orders/'.$order['id'].'/items/'.$itemId.'/download')
            ->assertForbidden();

        DB::table('ecommerce_orders')->where('id', $order['id'])->update(['payment_status' => 'PAID']);

        $otherToken = EcommerceCustomerAuth::issueSession($otherCustomer);
        $this->withCredentials()->withUnencryptedCookie(EcommerceCustomerAuth::COOKIE, $otherToken)
            ->get('/api/shop/digital-shop/customer/orders/'.$order['id'].'/items/'.$itemId.'/download')
            ->assertNotFound();

        $this->withCredentials()->withUnencryptedCookie(EcommerceCustomerAuth::COOKIE, $token)
            ->get('/api/shop/digital-shop/customer/orders/'.$order['id'].'/items/'.$itemId.'/download')
            ->assertOk();
    }

    private function enableDigitalSales(string $companyId): void
    {
        DB::table('maximus_company_modules')->updateOrInsert(
            ['company_id' => $companyId, 'module_id' => 'ecommerce'],
            [
                'id' => 'company-module-'.$companyId.'-ecommerce',
                'status' => 'ACTIF',
                'feature_ids' => json_encode(['dashboard', 'catalogue', 'vente-physique', 'vente-numerique']),
                'configuration' => json_encode(['featureScope' => 'explicit']),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );
    }

    private function createStore(string $companyId, string $slug): void
    {
        DB::table('ecommerce_stores')->insert([
            'id' => 'store-'.$companyId,
            'company_id' => $companyId,
            'slug' => $slug,
            'name' => 'Boutique '.$companyId,
            'description' => 'Boutique de test',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primary_color' => '#D69E2E',
            'accent_color' => '#172033',
            'logo_url' => '',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createProduct(string $companyId, string $slug, string $fulfillmentType, int $stock, ?string $path = null): string
    {
        $id = 'product-'.Str::uuid();
        DB::table('ecommerce_products')->insert([
            'id' => $id,
            'company_id' => $companyId,
            'name' => 'Produit '.$slug,
            'slug' => $slug,
            'sku' => strtoupper($slug),
            'description' => '',
            'category' => 'Général',
            'price' => 2500,
            'compare_at_price' => null,
            'stock' => $stock,
            'image_url' => '',
            'featured' => false,
            'status' => 'PUBLISHED',
            'fulfillment_type' => $fulfillmentType,
            'digital_file_path' => $path,
            'digital_file_name' => $path ? 'digital-book.pdf' : null,
            'digital_file_mime' => $path ? 'application/pdf' : null,
            'digital_file_size' => $path ? 14 : null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    private function createCustomer(string $id, string $companyId, string $email): object
    {
        DB::table('ecommerce_customers')->insert([
            'id' => $id,
            'company_id' => $companyId,
            'email' => $email,
            'name' => 'Client '.$id,
            'phone' => '',
            'password_hash' => MaximusPassword::hash('motdepasse-solide'),
            'status' => 'ACTIF',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return DB::table('ecommerce_customers')->where('id', $id)->first();
    }

    private function asActor(): self
    {
        $user = AuthUser::query()->create([
            'id' => 'digital-admin',
            'email' => 'digital-admin@kora.demo',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Gestionnaire numérique',
            'role' => 'company_admin',
            'company_id' => 'kora',
            'sector_ids' => [],
            'permissions' => [],
            'status' => 'ACTIF',
        ]);

        return $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user));
    }
}