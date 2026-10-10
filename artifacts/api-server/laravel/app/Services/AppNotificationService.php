<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class AppNotificationService
{
    /**
     * Store a company notification in the bell and send it to eligible push subscribers.
     *
     * @param  array<string, mixed>  $notification
     */
    public function publish(array $notification, string $requestHost): void
    {
        try {
            $stored = DB::transaction(function () use ($notification): bool {
                $row = DB::table('maximus_app_states')
                    ->where('scope', 'workspace')
                    ->lockForUpdate()
                    ->first();
                $payload = is_string($row?->payload)
                    ? json_decode($row->payload, true)
                    : ($row?->payload ?? []);
                $payload = is_array($payload) ? $payload : [];
                $notifications = is_array($payload['notifications'] ?? null)
                    ? $payload['notifications']
                    : [];
                foreach ($notifications as $existing) {
                    if (($existing['id'] ?? null) === ($notification['id'] ?? null)) {
                        return false;
                    }
                }

                array_unshift($notifications, $notification);
                $payload['notifications'] = array_slice($notifications, 0, 100);
                $now = now();
                DB::table('maximus_app_states')->updateOrInsert(
                    ['scope' => 'workspace'],
                    [
                        'company_id' => null,
                        'payload' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                        'version' => ((int) ($row?->version ?? 0)) + 1,
                        'updated_at' => $now,
                        'created_at' => $row?->created_at ?? $now,
                    ],
                );

                return true;
            });

            if ($stored) {
                $push = app(MaximusPushNotificationService::class);
                $push->dispatchNewNotifications([$notification], '', $requestHost);
            }
        } catch (Throwable $exception) {
            Log::warning('La notification de commande e-commerce n’a pas pu être enregistrée.', [
                'exception' => $exception::class,
            ]);
        }
    }
}
