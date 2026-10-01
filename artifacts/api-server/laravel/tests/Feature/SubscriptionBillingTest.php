<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Models\Company;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SubscriptionBillingTest extends TestCase
{
    use RefreshDatabase;

    public function test_maximus_can_set_module_grid_prices_and_adjust_the_company_amount(): void
    {
        $company = $this->createCompany('subscription-price-acme');
        $admin = $this->createAdmin('subscription-price-admin');
        $this->activateModule($company->id, 'commerce');
        $session = MaximusAuth::issueSession($admin);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $session)
            ->putJson('/api/platform-settings/subscription-billing/modules/commerce', [
                'monthlyAmount' => 18000,
            ])
            ->assertOk()
            ->assertJsonPath('module.monthlyAmount', 18000);

        $this->activateModule($company->id, 'stocks');
        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $session)
            ->putJson('/api/platform-settings/subscription-billing/modules/stocks', [
                'monthlyAmount' => 8000,
            ])
            ->assertOk()
            ->assertJsonPath('module.monthlyAmount', 8000);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $session)
            ->putJson('/api/platform-settings/subscription-billing/companies/'.$company->id, [
                'customAmount' => 27000,
            ])
            ->assertOk()
            ->assertJsonPath('customAmount', 27000);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $session)
            ->getJson('/api/platform-settings/subscription-billing')
            ->assertOk()
            ->assertJsonFragment(['id' => 'commerce', 'monthlyAmount' => 18000])
            ->assertJsonFragment(['id' => 'stocks', 'monthlyAmount' => 8000])
            ->assertJsonPath('companies.0.moduleTotal', 26000)
            ->assertJsonPath('companies.0.customAmount', 27000)
            ->assertJsonPath('companies.0.payableAmount', 27000);

        $this->assertDatabaseHas('maximus_company_subscription_prices', [
            'company_id' => $company->id,
            'custom_monthly_amount' => 27000,
            'updated_by' => $admin->id,
        ]);
    }

    public function test_removed_catalog_modules_are_excluded_from_the_grid_and_company_total(): void
    {
        $company = $this->createCompany('subscription-removed-module');
        $admin = $this->createAdmin('subscription-removed-module-admin');
        $this->activateModule($company->id, 'commerce');
        $this->activateModule($company->id, 'stocks');
        DB::table('maximus_app_states')->insert([
            'scope' => 'workspace',
            'company_id' => null,
            'payload' => json_encode([
                'removedModules' => ['commerce'],
                'moduleStatuses' => [],
            ], JSON_THROW_ON_ERROR),
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('maximus_subscription_module_prices')->insert([
            [
                'module_id' => 'commerce',
                'monthly_amount' => 12000,
                'updated_by' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'module_id' => 'stocks',
                'monthly_amount' => 8000,
                'updated_by' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $session = MaximusAuth::issueSession($admin);
        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $session)
            ->getJson('/api/platform-settings/subscription-billing')
            ->assertOk()
            ->assertJsonMissing(['id' => 'commerce'])
            ->assertJsonFragment(['id' => 'stocks', 'monthlyAmount' => 8000]);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession(
                $this->createCompanyAdmin('subscription-removed-module-company-admin', $company->id),
            ))
            ->getJson('/api/company-subscription')
            ->assertOk()
            ->assertJsonCount(1, 'modules')
            ->assertJsonPath('modules.0.id', 'stocks')
            ->assertJsonPath('moduleTotal', 8000)
            ->assertJsonPath('payableAmount', 8000);
    }

    public function test_company_admin_sees_own_pricing_but_sector_manager_is_forbidden(): void
    {
        $company = $this->createCompany('subscription-company-scope');
        $admin = $this->createCompanyAdmin('subscription-company-admin', $company->id);
        $manager = $this->createSectorManager('subscription-company-manager', $company->id);
        $this->activateModule($company->id, 'commerce');
        DB::table('maximus_subscription_module_prices')->insert([
            'module_id' => 'commerce',
            'monthly_amount' => 15000,
            'updated_by' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('maximus_company_subscription_prices')->insert([
            'company_id' => $company->id,
            'custom_monthly_amount' => 22000,
            'updated_by' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($admin))
            ->getJson('/api/company-subscription')
            ->assertOk()
            ->assertJsonPath('companyId', $company->id)
            ->assertJsonPath('modules.0.monthlyAmount', 15000)
            ->assertJsonPath('moduleTotal', 15000)
            ->assertJsonPath('customAmount', 22000)
            ->assertJsonPath('payableAmount', 22000);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($manager))
            ->getJson('/api/company-subscription')
            ->assertForbidden();
    }

    public function test_diamanopay_charge_uses_the_server_calculated_custom_amount_and_webhook_confirms_it(): void
    {
        $company = $this->createCompany('subscription-payment-acme');
        $admin = $this->createCompanyAdmin('subscription-payment-admin', $company->id);
        DB::table('maximus_company_subscription_prices')->insert([
            'company_id' => $company->id,
            'custom_monthly_amount' => 32000,
            'updated_by' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        config([
            'services.diamanopay.access_token' => 'test-access-token',
            'services.diamanopay.client_id' => '',
            'services.diamanopay.client_secret' => '',
            'services.diamanopay.webhook_secret' => 'test-webhook-secret',
            'services.diamanopay.webhook_url' => 'https://maximus.example.test',
            'services.diamanopay.base_url' => 'https://api.diamanopay.test',
        ]);
        Http::fake([
            'https://api.diamanopay.test/api/charges' => Http::response([
            'data' => [
                'chargeId' => 'subscription-charge-acme',
                'checkoutUrl' => 'https://checkout.diamanopay.test/charge/subscription-acme',
            ],
            ], 201),
        ]);

        $session = MaximusAuth::issueSession($admin);
        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $session)
            ->postJson('/api/company-subscription/payments', [
                'amount' => 1,
                'provider' => 'WAVE',
                'redirectUrl' => 'https://maximus.example.test/entreprise/organisation?tab=subscription',
            ])
            ->assertCreated()
            ->assertJsonPath('payment.amount', 32000)
            ->assertJsonPath('payment.status', 'PENDING')
            ->assertJsonPath('payment.checkoutUrl', 'https://checkout.diamanopay.test/charge/subscription-acme');

        Http::assertSent(function (ClientRequest $request): bool {
            $this->assertSame(32000, $request['amount']);
            $this->assertSame('XOF', $request['currency']);
            $this->assertSame('WAVE', $request['provider']);
            $this->assertStringStartsWith('subscription:', (string) $request->header('Idempotency-Key')[0]);

            return $request->url() === 'https://api.diamanopay.test/api/charges';
        });

        $this->assertDatabaseHas('maximus_subscription_payments', [
            'company_id' => $company->id,
            'amount' => 32000,
            'provider_charge_id' => 'subscription-charge-acme',
            'status' => 'PENDING',
        ]);

        $body = json_encode([
            'id' => 'subscription-charge-acme',
            'status' => 'SUCCESS',
        ], JSON_THROW_ON_ERROR);
        $signature = hash_hmac('sha256', $body, 'test-webhook-secret');
        $this->call(
            'POST',
            '/api/payments/diamanopay/subscription-webhook',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_DIAMANOPAY_SIGNATURE' => $signature,
            ],
            $body,
        )->assertOk()->assertJsonPath('received', true);

        $this->assertDatabaseHas('maximus_subscription_payments', [
            'company_id' => $company->id,
            'provider_charge_id' => 'subscription-charge-acme',
            'status' => 'PAID',
        ]);
    }

    private function createCompany(string $id): Company
    {
        return Company::query()->create([
            'id' => $id,
            'name' => 'Entreprise '.strtoupper($id),
            'manager' => 'Responsable',
            'email' => $id.'@maximus.test',
            'status' => 'ACTIF',
            'requested_modules' => [],
        ]);
    }

    private function createAdmin(string $id): AuthUser
    {
        return $this->createUser($id, 'maximus_admin', null);
    }

    private function createCompanyAdmin(string $id, string $companyId): AuthUser
    {
        return $this->createUser($id, 'company_admin', $companyId);
    }

    private function createSectorManager(string $id, string $companyId): AuthUser
    {
        return $this->createUser($id, 'sector_manager', $companyId);
    }

    private function createUser(string $id, string $role, ?string $companyId): AuthUser
    {
        return AuthUser::query()->create([
            'id' => $id,
            'email' => $id.'@maximus.test',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => $id,
            'role' => $role,
            'company_id' => $companyId,
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);
    }

    private function activateModule(string $companyId, string $moduleId): void
    {
        DB::table('maximus_company_modules')->updateOrInsert(
            ['company_id' => $companyId, 'module_id' => $moduleId],
            [
                'id' => 'company-module-'.$companyId.'-'.$moduleId,
                'status' => 'ACTIF',
                'feature_ids' => '[]',
                'configuration' => '{}',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );
    }
}