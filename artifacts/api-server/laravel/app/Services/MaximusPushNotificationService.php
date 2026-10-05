<?php

namespace App\Services;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\VAPID;
use Minishlink\WebPush\WebPush;
use Throwable;

class MaximusPushNotificationService
{
    private const SETTINGS_TABLE = 'maximus_push_notification_settings';

    private const SUBSCRIPTIONS_TABLE = 'maximus_push_subscriptions';

    private const COMPANY_ACCESS_TABLE = 'maximus_company_push_access';

    public function publicKey(): string
    {
        return $this->vapidKeys()['publicKey'];
    }

    public function canSubscribe(string $userId): bool
    {
        $user = DB::table('auth_users')->where('id', $userId)->first(['role', 'company_id']);
        if (! $user) {
            return false;
        }

        if ($user->role === 'maximus_admin') {
            return true;
        }

        $companyId = is_string($user->company_id) ? trim($user->company_id) : '';

        return $companyId !== '' && $this->isCompanyPushEnabled($companyId);
    }

    public function isCompanyPushEnabled(string $companyId): bool
    {
        $enabled = DB::table(self::COMPANY_ACCESS_TABLE)
            ->where('company_id', $companyId)
            ->value('enabled');

        return in_array($enabled, [true, 1, '1', 't', 'true'], true);
    }

    public function subscribe(string $userId, string $endpoint, string $publicKey, string $authSecret): void
    {
        if (! $this->isSupportedEndpoint($endpoint)) {
            throw ValidationException::withMessages([
                'endpoint' => 'Ce navigateur utilise un fournisseur de notifications non pris en charge.',
            ]);
        }

        $now = now();
        DB::table(self::SUBSCRIPTIONS_TABLE)->updateOrInsert(
            ['endpoint_hash' => hash('sha256', $endpoint)],
            [
                'endpoint_encrypted' => Crypt::encryptString($endpoint),
                'p256dh_encrypted' => Crypt::encryptString($publicKey),
                'auth_secret_encrypted' => Crypt::encryptString($authSecret),
                'auth_user_id' => $userId,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        );
    }

    public function unsubscribe(string $userId, string $endpoint): void
    {
        DB::table(self::SUBSCRIPTIONS_TABLE)
            ->where('endpoint_hash', hash('sha256', $endpoint))
            ->where('auth_user_id', $userId)
            ->delete();
    }

    /**
     * Resolve push recipients using the same audience and company rules as
     * getVisibleNotifications() in the MAXIMUS client.
     *
     * @param  array<string, mixed>  $notification
     * @return Collection<int, object>
     */
    public function recipientSubscriptions(array $notification, string $actorUserId): Collection
    {
        $audience = ($notification['audience'] ?? 'all') === 'admin' ? 'admin' : 'all';
        $companyId = is_string($notification['companyId'] ?? null)
            ? trim($notification['companyId'])
            : '';

        return DB::table(self::SUBSCRIPTIONS_TABLE.' as subscriptions')
            ->join('auth_users as users', 'users.id', '=', 'subscriptions.auth_user_id')
            ->where('users.status', 'ACTIF')
            ->when($actorUserId !== '', fn (Builder $query) => $query->where('users.id', '!=', $actorUserId))
            ->where(function (Builder $visibleUsers) use ($audience, $companyId): void {
                $visibleUsers->where('users.role', 'maximus_admin');

                if ($audience === 'admin') {
                    return;
                }

                $visibleUsers->orWhere(function (Builder $companyUsers) use ($companyId): void {
                    $companyUsers->where('users.role', '!=', 'maximus_admin');
                    $companyUsers->whereExists(function (Builder $access): void {
                        $access->selectRaw('1')
                            ->from(self::COMPANY_ACCESS_TABLE.' as company_push_access')
                            ->whereColumn('company_push_access.company_id', 'users.company_id')
                            ->where('company_push_access.enabled', true);
                    });
                    if ($companyId !== '') {
                        $companyUsers->where('users.company_id', $companyId);
                    }
                });
            })
            ->get([
                'subscriptions.endpoint_hash',
                'subscriptions.endpoint_encrypted',
                'subscriptions.p256dh_encrypted',
                'subscriptions.auth_secret_encrypted',
                'subscriptions.auth_user_id',
                'users.role',
            ]);
    }

    /**
     * @param  array<int, array<string, mixed>>  $notifications
     */
    public function dispatchNewNotifications(array $notifications, string $actorUserId, string $requestHost): void
    {
        try {
            $webPush = null;

            foreach (array_slice($notifications, 0, 10) as $notification) {
                $title = $this->limitedText($notification['title'] ?? null, 100);
                $body = $this->limitedText($notification['text'] ?? null, 240);
                if ($title === '' || $body === '') {
                    continue;
                }

                $recipients = $this->recipientSubscriptions($notification, $actorUserId);
                if ($recipients->isEmpty()) {
                    continue;
                }

                $keys = $this->vapidKeys();
                $webPush ??= new WebPush([
                    'VAPID' => [
                        'subject' => 'https://'.$requestHost,
                        'publicKey' => $keys['publicKey'],
                        'privateKey' => $keys['privateKey'],
                    ],
                ], ['TTL' => 300], 8);

                foreach ($recipients as $recipient) {
                    try {
                        $fallbackPath = $recipient->role === 'maximus_admin'
                            ? '/maximus/notifications'
                            : '/entreprise/notifications';
                        $payload = json_encode([
                            'id' => $this->limitedText($notification['id'] ?? null, 128),
                            'title' => $title,
                            'body' => $body,
                            'href' => $this->safeInternalPath($notification['href'] ?? null, $fallbackPath),
                        ], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

                        $webPush->queueNotification(
                            Subscription::create([
                                'endpoint' => Crypt::decryptString($recipient->endpoint_encrypted),
                                'keys' => [
                                    'p256dh' => Crypt::decryptString($recipient->p256dh_encrypted),
                                    'auth' => Crypt::decryptString($recipient->auth_secret_encrypted),
                                ],
                                'contentEncoding' => 'aes128gcm',
                            ]),
                            $payload,
                            ['TTL' => 300],
                        );
                    } catch (Throwable $exception) {
                        Log::warning('Une notification MAXIMUS n’a pas pu être préparée pour un abonnement.', [
                            'exception' => $exception::class,
                        ]);
                    }
                }
            }

            if (! $webPush) {
                return;
            }

            foreach ($webPush->flush() as $report) {
                if ($report->isSubscriptionExpired()) {
                    DB::table(self::SUBSCRIPTIONS_TABLE)
                        ->where('endpoint_hash', hash('sha256', $report->getEndpoint()))
                        ->delete();

                    continue;
                }

                if (! $report->isSuccess()) {
                    Log::warning('Le fournisseur Web Push a refusé une notification MAXIMUS.', [
                        'status' => $report->getResponse()?->getStatusCode(),
                    ]);
                }
            }
        } catch (Throwable $exception) {
            Log::warning('L’envoi des notifications MAXIMUS a échoué.', [
                'exception' => $exception::class,
            ]);
        }
    }

    /**
     * @return array{publicKey: string, privateKey: string}
     */
    private function vapidKeys(): array
    {
        return DB::transaction(function (): array {
            $settings = DB::table(self::SETTINGS_TABLE)->where('id', 1)->lockForUpdate()->first();
            if (! $settings) {
                throw new \RuntimeException('La configuration MAXIMUS Web Push est absente.');
            }

            if (is_string($settings->public_key) && is_string($settings->private_key_encrypted)) {
                return [
                    'publicKey' => $settings->public_key,
                    'privateKey' => Crypt::decryptString($settings->private_key_encrypted),
                ];
            }

            $keys = VAPID::createVapidKeys();
            DB::table(self::SETTINGS_TABLE)->where('id', 1)->update([
                'public_key' => $keys['publicKey'],
                'private_key_encrypted' => Crypt::encryptString($keys['privateKey']),
                'updated_at' => now(),
            ]);

            return $keys;
        });
    }

    private function isSupportedEndpoint(string $endpoint): bool
    {
        $parts = parse_url($endpoint);
        $host = strtolower((string) ($parts['host'] ?? ''));

        if (($parts['scheme'] ?? null) !== 'https' || $host === '') {
            return false;
        }

        return in_array($host, [
            'fcm.googleapis.com',
            'updates.push.services.mozilla.com',
            'push.services.mozilla.com',
            'web.push.apple.com',
        ], true) || str_ends_with($host, '.notify.windows.com');
    }

    private function limitedText(mixed $value, int $limit): string
    {
        if (! is_string($value)) {
            return '';
        }

        return mb_substr(trim(strip_tags($value)), 0, $limit);
    }

    private function safeInternalPath(mixed $value, string $fallbackPath): string
    {
        if (! is_string($value) || ! str_starts_with($value, '/') || str_starts_with($value, '//')) {
            return $fallbackPath;
        }

        return preg_match('/[\r\n\\\\]/', $value) ? $fallbackPath : $value;
    }
}
