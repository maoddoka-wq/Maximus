<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Models\Company;
use App\Support\MaximusAuth;
use App\Support\ModuleCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class EcommerceSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    public function test_maximus_can_set_price_and_toggle_ecommerce_access_without_losing_feature_selection(): void
    {
        $company = Company::query()->create([
            'id' => 'ecommerce-subscription-acme',
            'name' => 'Acme E-commerce',
            'manager' => 'Responsable',
            'email' => 'ecommerce-subscription-acme@maximus.test',
            'status' => 'ACTIF',
            'requested_modules' => [],
            'requested_module_pack_ids' => ['ecommerce' => ['ecommerce-vente-comptoir']],
            'requested_module_features' => [],
            'requested_module_permissions' => [],
        ]);
        $admin = $this->createAdmin('ecommerce-subscription-admin');
        $adminSession = MaximusAuth::issueSession($admin);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $adminSession)
            ->putJson('/api/platform-settings/ecommerce-subscriptions/'.$company->id, [
                'status' => 'ACTIF',
                'monthlyAmount' => 12000,
            ])
            ->assertOk()
            ->assertJsonPath('subscription.companyId', $company->id)
            ->assertJsonPath('subscription.companyName', $company->name)
            ->assertJsonPath('subscription.status', 'ACTIF')
            ->assertJsonPath('subscription.monthlyAmount', 12000);

        $this->assertDatabaseHas('maximus_company_ecommerce_prices', [
            'company_id' => $company->id,
            'monthly_amount' => 12000,
            'updated_by' => $admin->id,
        ]);
        $this->assertDatabaseHas('maximus_company_modules', [
            'company_id' => $company->id,
            'module_id' => 'ecommerce',
            'status' => 'ACTIF',
        ]);
        $this->assertContains('ecommerce', $company->fresh()->requested_modules);
        $this->assertFalse(ModuleCatalog::isEnabled($company->id, 'ecommerce'));
        DB::table('maximus_company_ecommerce_prices')
            ->where('company_id', $company->id)
            ->update(['paid_through_at' => now()->addDays(30)]);
        $this->assertTrue(ModuleCatalog::isEnabled($company->id, 'ecommerce'));

        $activeAccess = DB::table('maximus_company_modules')
            ->where('company_id', $company->id)
            ->where('module_id', 'ecommerce')
            ->first();
        $activeFeatures = json_decode($activeAccess->feature_ids, true);
        $activeConfiguration = json_decode($activeAccess->configuration, true);
        $this->assertContains('vente-comptoir', $activeFeatures);
        $this->assertSame('explicit', $activeConfiguration['featureScope'] ?? null);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $adminSession)
            ->putJson('/api/platform-settings/ecommerce-subscriptions/'.$company->id, [
                'status' => 'INACTIF',
                'monthlyAmount' => 12000,
            ])
            ->assertOk()
            ->assertJsonPath('subscription.status', 'INACTIF');

        $inactiveAccess = DB::table('maximus_company_modules')
            ->where('company_id', $company->id)
            ->where('module_id', 'ecommerce')
            ->first();
        $this->assertSame('INACTIF', $inactiveAccess->status);
        $this->assertSame($activeFeatures, json_decode($inactiveAccess->feature_ids, true));
        $this->assertSame($activeConfiguration, json_decode($inactiveAccess->configuration, true));
        $this->assertNotContains('ecommerce', $company->fresh()->requested_modules);
        $this->assertFalse(ModuleCatalog::isEnabled($company->id, 'ecommerce'));

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $adminSession)
            ->getJson('/api/platform-settings/ecommerce-subscriptions')
            ->assertOk()
            ->assertJsonPath('subscriptions.0.companyId', $company->id)
            ->assertJsonPath('subscriptions.0.status', 'INACTIF')
            ->assertJsonPath('subscriptions.0.monthlyAmount', 12000);
    }

    public function test_active_subscription_requires_an_explicit_monthly_price(): void
    {
        $company = Company::query()->create([
            'id' => 'ecommerce-price-required',
            'name' => 'Prix requis',
            'manager' => 'Responsable',
            'email' => 'ecommerce-price-required@maximus.test',
            'status' => 'ACTIF',
            'requested_modules' => [],
        ]);
        $admin = $this->createAdmin('ecommerce-price-admin');

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($admin))
            ->putJson('/api/platform-settings/ecommerce-subscriptions/'.$company->id, [
                'status' => 'ACTIF',
                'monthlyAmount' => null,
            ])
            ->assertUnprocessable()
            ->assertJsonPath('error', 'Définissez d’abord un tarif mensuel strictement supérieur à 0 FCFA avant d’activer l’abonnement.');

        $this->assertDatabaseMissing('maximus_company_modules', [
            'company_id' => $company->id,
            'module_id' => 'ecommerce',
        ]);
        $this->assertDatabaseMissing('maximus_company_ecommerce_prices', [
            'company_id' => $company->id,
        ]);
    }

    public function test_company_admin_cannot_change_an_ecommerce_subscription(): void
    {
        $company = Company::query()->create([
            'id' => 'ecommerce-company-admin',
            'name' => 'Entreprise',
            'manager' => 'Responsable',
            'email' => 'ecommerce-company-admin@maximus.test',
            'status' => 'ACTIF',
            'requested_modules' => [],
        ]);
        $companyAdmin = AuthUser::query()->create([
            'id' => 'ecommerce-company-admin-user',
            'email' => 'ecommerce-company-admin-user@maximus.test',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Admin entreprise',
            'role' => 'company_admin',
            'company_id' => $company->id,
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($companyAdmin))
            ->putJson('/api/platform-settings/ecommerce-subscriptions/'.$company->id, [
                'status' => 'ACTIF',
                'monthlyAmount' => 12000,
            ])
            ->assertForbidden();
    }

    public function test_zero_price_cannot_activate_an_ecommerce_subscription(): void
    {
        $company = Company::query()->create([
            'id' => 'ecommerce-zero-price',
            'name' => 'Tarif nul',
            'manager' => 'Responsable',
            'email' => 'ecommerce-zero-price@maximus.test',
            'status' => 'ACTIF',
            'requested_modules' => [],
        ]);
        $admin = $this->createAdmin('ecommerce-zero-price-admin');

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($admin))
            ->putJson('/api/platform-settings/ecommerce-subscriptions/'.$company->id, [
                'status' => 'ACTIF',
                'monthlyAmount' => 0,
            ])
            ->assertUnprocessable()
            ->assertJsonPath('error', 'Définissez d’abord un tarif mensuel strictement supérieur à 0 FCFA avant d’activer l’abonnement.');

        $this->assertDatabaseMissing('maximus_company_ecommerce_prices', [
            'company_id' => $company->id,
        ]);
    }

    public function test_verified_diamanopay_payment_grants_one_idempotent_30_day_period(): void
    {
        $company = Company::query()->create([
            'id' => 'ecommerce-paid-period',
            'name' => 'Abonnement payé',
            'manager' => 'Responsable',
            'email' => 'ecommerce-paid-period@maximus.test',
            'status' => 'ACTIF',
            'requested_modules' => [],
        ]);
        $maximusAdmin = $this->createAdmin('ecommerce-paid-period-admin');
        $companyAdmin = AuthUser::query()->create([
            'id' => 'ecommerce-paid-period-company-admin',
            'email' => 'ecommerce-paid-period-company-admin@maximus.test',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Admin entreprise',
            'role' => 'company_admin',
            'company_id' => $company->id,
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);
        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($maximusAdmin))
            ->putJson('/api/platform-settings/ecommerce-subscriptions/'.$company->id, [
                'status' => 'ACTIF',
                'monthlyAmount' => 12000,
            ])
            ->assertOk();

        config([
            'services.diamanopay.base_url' => 'https://payments.example.test',
            'services.diamanopay.access_token' => 'test-access-token',
            'services.diamanopay.client_id' => '',
            'services.diamanopay.client_secret' => '',
            'services.diamanopay.webhook_secret' => 'subscription-test-webhook-secret',
            'services.diamanopay.webhook_url' => 'https://api.example.test/api/payments/diamanopay/webhook',
        ]);
        Http::fake([
            'https://payments.example.test/api/charges' => Http::response([
                'success' => true,
                'data' => [
                    'chargeId' => 'subscription-charge-1',
                    'checkoutUrl' => 'https://payments.example.test/checkout/subscription-charge-1',
                ],
            ], 201),
            'https://payments.example.test/api/charges/subscription-charge-1' => Http::response([
                'data' => ['status' => 'PENDING'],
            ], 200),
        ]);

        $companySession = MaximusAuth::issueSession($companyAdmin);
        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $companySession)
            ->getJson('/api/company/ecommerce-subscription')
            ->assertOk()
            ->assertJsonPath('subscription.status', 'PAYMENT_REQUIRED')
            ->assertJsonPath('subscription.daysRemaining', null);

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $companySession)
            ->postJson('/api/company/ecommerce-subscription/checkout', [
                'provider' => 'WAVE',
                'redirectUrl' => 'http://localhost/entreprise/abonnement?payment=1',
            ])
            ->assertCreated()
            ->assertJsonPath('payment.amount', 12000)
            ->assertJsonPath('payment.currency', 'XOF')
            ->assertJsonPath('payment.status', 'PENDING')
            ->assertJsonPath('payment.checkoutUrl', 'https://payments.example.test/checkout/subscription-charge-1');

        $payment = DB::table('maximus_company_ecommerce_subscription_payments')
            ->where('company_id', $company->id)
            ->first();
        $webhookBody = json_encode([
            'data' => [
                'id' => 'subscription-charge-1',
                'status' => 'SUCCESS',
                'amount' => 12000,
                'currency' => 'XOF',
                'clientReference' => $payment->reference,
            ],
        ], JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        $signature = hash_hmac('sha256', $webhookBody, 'subscription-test-webhook-secret');
        $webhookHeaders = [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_DIAMANOPAY_SIGNATURE' => $signature,
        ];

        $this->call('POST', '/api/payments/diamanopay/webhook', [], [], [], $webhookHeaders, $webhookBody)
            ->assertOk()
            ->assertJsonPath('received', true);

        $paidThrough = DB::table('maximus_company_ecommerce_prices')
            ->where('company_id', $company->id)
            ->value('paid_through_at');
        $this->assertNotNull($paidThrough);
        $this->assertTrue(now()->addDays(29)->isBefore(\Illuminate\Support\Carbon::parse($paidThrough)));
        $this->assertTrue(now()->addDays(30)->addMinute()->isAfter(\Illuminate\Support\Carbon::parse($paidThrough)));
        $this->assertDatabaseHas('maximus_company_ecommerce_subscription_payments', [
            'company_id' => $company->id,
            'status' => 'PAID',
            'period_ends_at' => $paidThrough,
        ]);
        $this->assertTrue(ModuleCatalog::isEnabled($company->id, 'ecommerce'));

        $this->call('POST', '/api/payments/diamanopay/webhook', [], [], [], $webhookHeaders, $webhookBody)
            ->assertOk();
        $this->assertSame(
            $paidThrough,
            DB::table('maximus_company_ecommerce_prices')->where('company_id', $company->id)->value('paid_through_at'),
        );

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $companySession)
            ->getJson('/api/company/ecommerce-subscription')
            ->assertOk()
            ->assertJsonPath('subscription.status', 'ACTIVE')
            ->assertJsonPath('subscription.daysRemaining', 30)
            ->assertJsonPath('subscription.payment.status', 'PAID');

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($maximusAdmin))
            ->getJson('/api/platform-settings/ecommerce-subscriptions')
            ->assertOk()
            ->assertJsonPath('subscriptions.0.subscriptionStatus', 'ACTIVE')
            ->assertJsonPath('subscriptions.0.lastPaymentStatus', 'PAID');
    }

    public function test_early_renewal_adds_another_30_days_to_the_existing_period(): void
    {
        $company = Company::query()->create([
            'id' => 'ecommerce-early-renewal',
            'name' => 'Renouvellement anticipé',
            'manager' => 'Responsable',
            'email' => 'ecommerce-early-renewal@maximus.test',
            'status' => 'ACTIF',
            'requested_modules' => [],
        ]);
        $maximusAdmin = $this->createAdmin('ecommerce-early-renewal-admin');
        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($maximusAdmin))
            ->putJson('/api/platform-settings/ecommerce-subscriptions/'.$company->id, [
                'status' => 'ACTIF',
                'monthlyAmount' => 12000,
            ])
            ->assertOk();

        $firstPeriodEnd = now()->addDays(30)->startOfSecond();
        DB::table('maximus_company_ecommerce_prices')
            ->where('company_id', $company->id)
            ->update(['paid_through_at' => $firstPeriodEnd]);
        DB::table('maximus_company_ecommerce_subscription_payments')->insert([
            'id' => 'ecommerce-early-renewal-payment',
            'company_id' => $company->id,
            'reference' => 'MAX-SUB-EARLY-RENEWAL',
            'amount' => 12000,
            'currency' => 'XOF',
            'provider' => 'WAVE',
            'status' => 'PENDING',
            'idempotency_key' => 'ecommerce-subscription:early-renewal',
            'provider_charge_id' => 'subscription-early-renewal-charge',
            'checkout_url' => 'https://payments.example.test/checkout/renewal',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        config(['services.diamanopay.webhook_secret' => 'subscription-renewal-webhook-secret']);

        $webhookBody = json_encode([
            'data' => [
                'id' => 'subscription-early-renewal-charge',
                'status' => 'SUCCESS',
                'amount' => 12000,
                'currency' => 'XOF',
                'clientReference' => 'MAX-SUB-EARLY-RENEWAL',
            ],
        ], JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        $signature = hash_hmac('sha256', $webhookBody, 'subscription-renewal-webhook-secret');
        $headers = [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_DIAMANOPAY_SIGNATURE' => $signature,
        ];

        $this->call('POST', '/api/payments/diamanopay/webhook', [], [], [], $headers, $webhookBody)
            ->assertOk();

        $expectedEnd = $firstPeriodEnd->copy()->addDays(30);
        $paidThrough = \Illuminate\Support\Carbon::parse(
            DB::table('maximus_company_ecommerce_prices')->where('company_id', $company->id)->value('paid_through_at'),
        );
        $this->assertSame($expectedEnd->toDateTimeString(), $paidThrough->toDateTimeString());

        $this->call('POST', '/api/payments/diamanopay/webhook', [], [], [], $headers, $webhookBody)
            ->assertOk();
        $this->assertSame(
            $expectedEnd->toDateTimeString(),
            \Illuminate\Support\Carbon::parse(
                DB::table('maximus_company_ecommerce_prices')->where('company_id', $company->id)->value('paid_through_at'),
            )->toDateTimeString(),
        );
    }

    public function test_public_store_without_a_managed_price_keeps_legacy_access(): void
    {
        $company = Company::query()->create([
            'id' => 'ecommerce-unmanaged-public-store',
            'name' => 'Boutique historique',
            'manager' => 'Responsable',
            'email' => 'ecommerce-unmanaged-public-store@maximus.test',
            'status' => 'ACTIF',
            'requested_modules' => ['ecommerce'],
        ]);
        $slug = 'ecommerce-unmanaged-public-store';

        DB::table('company_public_site_access')->updateOrInsert(
            ['company_id' => $company->id],
            [
                'enabled' => true,
                'updated_by' => 'subscription-test',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );
        DB::table('ecommerce_stores')->insert([
            'id' => 'ecommerce-unmanaged-public-store-row',
            'company_id' => $company->id,
            'slug' => $slug,
            'name' => 'Boutique historique',
            'description' => '',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primary_color' => '#D69E2E',
            'accent_color' => '#172033',
            'logo_url' => '',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->assertDatabaseMissing('maximus_company_ecommerce_prices', [
            'company_id' => $company->id,
        ]);
        $this->getJson('/api/shop/'.$slug)
            ->assertOk()
            ->assertJsonPath('store.slug', $slug);
    }

    public function test_expired_subscription_blocks_company_module_apis_and_module_bootstrap(): void
    {
        $company = Company::query()->create([
            'id' => 'ecommerce-expired-period',
            'name' => 'Abonnement expiré',
            'manager' => 'Responsable',
            'email' => 'ecommerce-expired-period@maximus.test',
            'status' => 'ACTIF',
            'requested_modules' => [],
        ]);
        $maximusAdmin = $this->createAdmin('ecommerce-expired-period-admin');
        $companyAdmin = AuthUser::query()->create([
            'id' => 'ecommerce-expired-period-company-admin',
            'email' => 'ecommerce-expired-period-company-admin@maximus.test',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Admin entreprise',
            'role' => 'company_admin',
            'company_id' => $company->id,
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);
        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, MaximusAuth::issueSession($maximusAdmin))
            ->putJson('/api/platform-settings/ecommerce-subscriptions/'.$company->id, [
                'status' => 'ACTIF',
                'monthlyAmount' => 12000,
            ])
            ->assertOk();
        DB::table('maximus_company_ecommerce_prices')
            ->where('company_id', $company->id)
            ->update(['paid_through_at' => now()->subSecond()]);
        $companySession = MaximusAuth::issueSession($companyAdmin);

        $this->assertFalse(ModuleCatalog::isEnabled($company->id, 'ecommerce'));
        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $companySession)
            ->getJson('/api/ecommerce/bootstrap')
            ->assertForbidden()
            ->assertJsonPath('code', 'ECOMMERCE_SUBSCRIPTION_REQUIRED');

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $companySession)
            ->getJson('/api/modules/bootstrap')
            ->assertOk()
            ->assertJsonPath('modules.1.status', 'INACTIF')
            ->assertJsonPath('modules.1.accessReason', 'ECOMMERCE_SUBSCRIPTION_REQUIRED');

        $this->withCredentials()
            ->withUnencryptedCookie(MaximusAuth::COOKIE, $companySession)
            ->getJson('/api/company/ecommerce-subscription')
            ->assertOk()
            ->assertJsonPath('subscription.status', 'EXPIRED')
            ->assertJsonPath('subscription.daysRemaining', 0);

        DB::table('company_public_site_access')->updateOrInsert(
            ['company_id' => $company->id],
            [
                'enabled' => true,
                'updated_by' => 'subscription-test',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );
        DB::table('ecommerce_stores')->insert([
            'id' => 'ecommerce-expired-public-store',
            'company_id' => $company->id,
            'slug' => 'ecommerce-expired-public-store',
            'name' => 'Boutique expirée',
            'description' => '',
            'status' => 'PUBLISHED',
            'currency' => 'XOF',
            'primary_color' => '#D69E2E',
            'accent_color' => '#172033',
            'logo_url' => '',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->getJson('/api/shop/ecommerce-expired-public-store')
            ->assertForbidden()
            ->assertJsonPath('code', 'ECOMMERCE_SUBSCRIPTION_REQUIRED');
    }

    private function createAdmin(string $id): AuthUser
    {
        return AuthUser::query()->create([
            'id' => $id,
            'email' => $id.'@maximus.test',
            'password_hash' => 'not-used-in-this-test',
            'display_name' => 'Administration MAXIMUS',
            'role' => 'maximus_admin',
            'company_id' => null,
            'sector_ids' => [],
            'status' => 'ACTIF',
        ]);
    }
}