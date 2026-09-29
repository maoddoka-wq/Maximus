<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CommerceProductImageTest extends TestCase
{
    use RefreshDatabase;

    public function test_commerce_product_photo_is_company_scoped_and_separate_from_stock_storage(): void
    {
        Storage::fake('module-product-images');
        $request = $this->asActor();
        $productId = 'commerce-photo-01';
        $imageUrl = '/api/commerce/products/'.$productId.'/image';

        $request->post('/api/commerce/product-images/'.$productId.'?companyId=kora', [
            'image' => UploadedFile::fake()->image('commerce-product.jpg'),
        ])->assertOk()->assertJsonPath('imageUrl', $imageUrl);

        $commercePath = 'commerce/kora/'.$productId.'/photo';
        $stockPath = 'stocks/kora/'.$productId.'/photo';
        Storage::disk('module-product-images')->assertExists($commercePath);
        Storage::disk('module-product-images')->assertMissing($stockPath);

        $request->get($imageUrl.'?companyId=other-company')->assertForbidden();
        $imageResponse = $request->get($imageUrl.'?companyId=kora')
            ->assertOk()
            ->assertHeader('Content-Type', 'image/jpeg');
        $this->assertSame(Storage::disk('module-product-images')->get($commercePath), $imageResponse->baseResponse->getFile()->getContent());

        $request->post($imageUrl.'?companyId=kora', [
            'image' => UploadedFile::fake()->image('commerce-product-replaced.webp'),
        ])->assertOk()->assertJsonPath('imageUrl', $imageUrl);
        $request->get($imageUrl.'?companyId=kora')->assertOk()->assertHeader('Content-Type', 'image/webp');
    }

    public function test_create_only_commerce_users_cannot_replace_an_existing_product_photo(): void
    {
        Storage::fake('module-product-images');
        $existingPath = 'commerce/kora/existing-product/photo';
        Storage::disk('module-product-images')->put($existingPath, 'original-photo-bytes');
        $request = $this->asActor('employee', [
            'commerce:menu:products' => ['voir', 'créer'],
        ]);

        $request->post('/api/commerce/product-images/existing-product?companyId=kora', [
            'image' => UploadedFile::fake()->image('attempted-overwrite.jpg'),
        ])->assertStatus(409);
        $request->post('/api/commerce/products/existing-product/image?companyId=kora', [
            'image' => UploadedFile::fake()->image('forbidden.jpg'),
        ])->assertForbidden();
        $this->assertSame('original-photo-bytes', Storage::disk('module-product-images')->get($existingPath));
    }

    private function asActor(string $role = 'company_admin', array $permissions = []): self
    {
        $user = AuthUser::query()->create([
            'id' => 'commerce-photo-'.strtolower($role),
            'email' => 'commerce-photo-'.strtolower($role).'@kora.demo',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Gestionnaire commercial',
            'role' => $role,
            'company_id' => 'kora',
            'employee_id' => $role === 'employee' ? 'commerce-photo-employee' : null,
            'sector_ids' => [],
            'permissions' => $permissions,
            'status' => 'ACTIF',
        ]);

        return $this
            ->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($user));
    }
}