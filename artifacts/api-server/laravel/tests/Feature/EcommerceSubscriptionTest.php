<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Models\Company;
use App\Support\MaximusAuth;
use App\Support\ModuleCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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
                'monthlyAmount' => 0,
            ])
            ->assertOk()
            ->assertJsonPath('subscription.companyId', $company->id)
            ->assertJsonPath('subscription.companyName', $company->name)
            ->assertJsonPath('subscription.status', 'ACTIF')
            ->assertJsonPath('subscription.monthlyAmount', 0);

        $this->assertDatabaseHas('maximus_company_ecommerce_prices', [
            'company_id' => $company->id,
            'monthly_amount' => 0,
            'updated_by' => $admin->id,
        ]);
        $this->assertDatabaseHas('maximus_company_modules', [
            'company_id' => $company->id,
            'module_id' => 'ecommerce',
            'status' => 'ACTIF',
        ]);
        $this->assertContains('ecommerce', $company->fresh()->requested_modules);
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
                'monthlyAmount' => 0,
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
            ->assertJsonPath('subscriptions.0.monthlyAmount', 0);
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
            ->assertJsonPath('error', 'Définissez d’abord un tarif mensuel, même à 0 FCFA, avant d’activer l’abonnement.');

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