<?php

namespace Tests\Feature;

use App\Services\MaximusPushNotificationService;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Tests\Support\NotificationPushTestCase;

class NotificationPushTest extends NotificationPushTestCase
{
    public function test_authenticated_user_can_create_and_remove_a_private_push_subscription(): void
    {
        $user = $this->createPushTestUser('maximus_admin');
        $endpoint = 'https://fcm.googleapis.com/fcm/send/'.$user->id;
        $this->loginAsPushTestUser($user);

        $publicKeyResponse = $this->getJson('/api/notifications/push/public-key')
            ->assertOk()
            ->assertJsonStructure(['publicKey']);
        $publicKey = $publicKeyResponse->json('publicKey');
        $this->assertIsString($publicKey);
        $this->assertSame($publicKey, $this->getJson('/api/notifications/push/public-key')->json('publicKey'));

        $this->postJson('/api/notifications/push/subscriptions', [
            'endpoint' => $endpoint,
            'keys' => ['p256dh' => 'public-key-test', 'auth' => 'auth-secret-test'],
        ])->assertOk()->assertJson(['ok' => true]);

        $stored = DB::table('maximus_push_subscriptions')->first();
        $this->assertNotNull($stored);
        $this->assertSame(hash('sha256', $endpoint), $stored->endpoint_hash);
        $this->assertNotSame($endpoint, $stored->endpoint_encrypted);
        $this->assertSame($endpoint, Crypt::decryptString($stored->endpoint_encrypted));
        $this->assertSame('public-key-test', Crypt::decryptString($stored->p256dh_encrypted));
        $this->assertSame('auth-secret-test', Crypt::decryptString($stored->auth_secret_encrypted));
        $this->assertSame($user->id, $stored->auth_user_id);

        $otherUser = $this->createPushTestUser('maximus_admin');
        $this->loginAsPushTestUser($otherUser);
        $this->deleteJson('/api/notifications/push/subscriptions', ['endpoint' => $endpoint])->assertOk();
        $this->assertDatabaseHas('maximus_push_subscriptions', ['endpoint_hash' => hash('sha256', $endpoint)]);

        $this->loginAsPushTestUser($user);
        $this->deleteJson('/api/notifications/push/subscriptions', ['endpoint' => $endpoint])
            ->assertOk()
            ->assertJson(['ok' => true]);
        $this->assertDatabaseMissing('maximus_push_subscriptions', ['endpoint_hash' => hash('sha256', $endpoint)]);
    }

    public function test_subscription_endpoint_cannot_target_an_arbitrary_server(): void
    {
        $user = $this->createPushTestUser('maximus_admin');
        $this->loginAsPushTestUser($user);

        $this->postJson('/api/notifications/push/subscriptions', [
            'endpoint' => 'https://127.0.0.1/admin',
            'keys' => ['p256dh' => 'public-key-test', 'auth' => 'auth-secret-test'],
        ])->assertUnprocessable();

        $this->assertDatabaseCount('maximus_push_subscriptions', 0);
    }

    public function test_push_recipient_lookup_matches_notification_audience_and_company_scope(): void
    {
        $service = app(MaximusPushNotificationService::class);
        $platformAdmin = $this->createPushTestUser('maximus_admin');
        $companyAdminA = $this->createPushTestUser('company_admin', 'push-company-a');
        $employeeA = $this->createPushTestUser('employee', 'push-company-a');
        $companyAdminB = $this->createPushTestUser('company_admin', 'push-company-b');
        $inactiveAdmin = $this->createPushTestUser('company_admin', 'push-company-a', 'INACTIF');
        $users = [$platformAdmin, $companyAdminA, $employeeA, $companyAdminB, $inactiveAdmin];
        DB::table('maximus_company_push_access')->insert([
            [
                'company_id' => 'push-company-a',
                'enabled' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'company_id' => 'push-company-b',
                'enabled' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        foreach ($users as $user) {
            $service->subscribe(
                $user->id,
                "https://fcm.googleapis.com/fcm/send/{$user->id}",
                'public-'.$user->id,
                'auth-'.$user->id,
            );
        }

        $companyRecipients = $service->recipientSubscriptions([
            'audience' => 'company',
            'companyId' => 'push-company-a',
        ], $companyAdminA->id)->pluck('auth_user_id')->all();
        $expectedCompanyRecipients = [$employeeA->id, $platformAdmin->id];
        sort($companyRecipients);
        sort($expectedCompanyRecipients);
        $this->assertSame($expectedCompanyRecipients, $companyRecipients);

        $adminRecipients = $service->recipientSubscriptions([
            'audience' => 'admin',
            'companyId' => 'push-company-a',
        ], $companyAdminA->id)->pluck('auth_user_id')->all();
        $this->assertSame([$platformAdmin->id], $adminRecipients);

        $allRecipients = $service->recipientSubscriptions(['audience' => 'all'], $companyAdminA->id)
            ->pluck('auth_user_id')
            ->all();
        $expectedAllRecipients = [$employeeA->id, $companyAdminB->id, $platformAdmin->id];
        sort($allRecipients);
        sort($expectedAllRecipients);
        $this->assertSame($expectedAllRecipients, $allRecipients);
    }
}
