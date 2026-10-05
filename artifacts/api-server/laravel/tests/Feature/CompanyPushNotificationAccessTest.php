<?php

namespace Tests\Feature;

use Tests\Support\NotificationPushTestCase;

class CompanyPushNotificationAccessTest extends NotificationPushTestCase
{
    public function test_only_maximus_can_manage_company_push_access_and_company_users_need_approval(): void
    {
        $companyAdmin = $this->createPushTestUser('company_admin', 'push-company-a');
        $companyEndpoint = 'https://fcm.googleapis.com/fcm/send/'.$companyAdmin->id;

        $this->loginAsPushTestUser($companyAdmin);
        $this->getJson('/api/notifications/push/access')
            ->assertOk()
            ->assertJson(['allowed' => false]);
        $this->getJson('/api/companies/push-company-a/notifications/push-access')->assertForbidden();
        $this->patchJson('/api/companies/push-company-a/notifications/push-access', ['enabled' => true])
            ->assertForbidden();
        $this->getJson('/api/notifications/push/public-key')
            ->assertForbidden()
            ->assertJsonPath('code', 'PUSH_ACCESS_NOT_AUTHORIZED');
        $this->postJson('/api/notifications/push/subscriptions', [
            'endpoint' => $companyEndpoint,
            'keys' => ['p256dh' => 'public-key-test', 'auth' => 'auth-secret-test'],
        ])->assertForbidden()->assertJsonPath('code', 'PUSH_ACCESS_NOT_AUTHORIZED');
        $this->assertDatabaseMissing('maximus_company_push_access', ['company_id' => 'push-company-a']);
        $this->assertDatabaseCount('maximus_push_subscriptions', 0);

        $maximusAdmin = $this->createPushTestUser('maximus_admin');
        $this->loginAsPushTestUser($maximusAdmin);
        $this->getJson('/api/companies/push-company-a/notifications/push-access')
            ->assertOk()
            ->assertJson(['companyId' => 'push-company-a', 'enabled' => false]);
        $this->patchJson('/api/companies/push-company-a/notifications/push-access', ['enabled' => true])
            ->assertOk()
            ->assertJson(['companyId' => 'push-company-a', 'enabled' => true]);

        $this->loginAsPushTestUser($companyAdmin);
        $this->getJson('/api/notifications/push/access')
            ->assertOk()
            ->assertJson(['allowed' => true]);
        $this->getJson('/api/notifications/push/public-key')->assertOk()->assertJsonStructure(['publicKey']);
        $this->postJson('/api/notifications/push/subscriptions', [
            'endpoint' => $companyEndpoint,
            'keys' => ['p256dh' => 'public-key-test', 'auth' => 'auth-secret-test'],
        ])->assertOk()->assertJson(['ok' => true]);

        $this->loginAsPushTestUser($maximusAdmin);
        $this->patchJson('/api/companies/push-company-a/notifications/push-access', ['enabled' => false])
            ->assertOk()
            ->assertJson(['enabled' => false]);

        $this->loginAsPushTestUser($companyAdmin);
        $this->getJson('/api/notifications/push/access')
            ->assertOk()
            ->assertJson(['allowed' => false]);
        $this->deleteJson('/api/notifications/push/subscriptions', ['endpoint' => $companyEndpoint])
            ->assertOk()
            ->assertJson(['ok' => true]);
    }
}
