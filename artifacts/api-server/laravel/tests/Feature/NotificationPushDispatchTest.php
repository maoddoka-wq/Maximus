<?php

namespace Tests\Feature;

use App\Services\MaximusPushNotificationService;
use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\Support\NotificationPushTestCase;

class NotificationPushDispatchTest extends NotificationPushTestCase
{
    public function test_app_state_dispatches_only_new_unread_notifications_after_commit(): void
    {
        $user = $this->createPushTestUser('maximus_admin');
        DB::table('maximus_app_states')->updateOrInsert([
            'scope' => 'workspace',
        ], [
            'company_id' => null,
            'payload' => json_encode(['notifications' => []], JSON_THROW_ON_ERROR),
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $dispatcher = Mockery::mock(MaximusPushNotificationService::class);
        $dispatcher->shouldReceive('dispatchNewNotifications')
            ->once()
            ->with(
                Mockery::on(fn (array $notifications): bool =>
                    count($notifications) === 1
                    && ($notifications[0]['id'] ?? null) === 'new-alert'
                ),
                $user->id,
                Mockery::type('string'),
            );
        $this->app->instance(MaximusPushNotificationService::class, $dispatcher);
        $this->loginAsPushTestUser($user);

        $notification = [
            'id' => 'new-alert',
            'title' => 'Nouvelle alerte',
            'text' => 'Un événement vient d’être enregistré.',
            'read' => false,
            'audience' => 'all',
        ];
        $this->putJson('/api/app-state', [
            'version' => 1,
            'data' => ['notifications' => [$notification]],
        ])->assertOk();

        $this->putJson('/api/app-state', [
            'version' => 2,
            'data' => ['notifications' => [$notification]],
        ])->assertOk();
    }
}
