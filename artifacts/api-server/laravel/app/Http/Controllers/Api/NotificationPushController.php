<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\MaximusPushNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class NotificationPushController extends Controller
{
    public function publicKey(Request $request, MaximusPushNotificationService $push): JsonResponse
    {
        if (! $this->authenticatedUserId($request)) {
            return response()->json(['error' => 'Session MAXIMUS absente ou expirée.'], 401);
        }

        try {
            return response()->json(['publicKey' => $push->publicKey()]);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'error' => 'Les notifications navigateur ne sont pas disponibles pour le moment.',
            ], 503);
        }
    }

    public function subscribe(Request $request, MaximusPushNotificationService $push): JsonResponse
    {
        $userId = $this->authenticatedUserId($request);
        if (! $userId) {
            return response()->json(['error' => 'Session MAXIMUS absente ou expirée.'], 401);
        }

        $payload = $request->validate([
            'endpoint' => ['required', 'string', 'url', 'max:4096'],
            'keys' => ['required', 'array'],
            'keys.p256dh' => ['required', 'string', 'max:512'],
            'keys.auth' => ['required', 'string', 'max:256'],
        ]);

        $push->subscribe(
            $userId,
            $payload['endpoint'],
            $payload['keys']['p256dh'],
            $payload['keys']['auth'],
        );

        return response()->json(['ok' => true]);
    }

    public function unsubscribe(Request $request, MaximusPushNotificationService $push): JsonResponse
    {
        $userId = $this->authenticatedUserId($request);
        if (! $userId) {
            return response()->json(['error' => 'Session MAXIMUS absente ou expirée.'], 401);
        }

        $payload = $request->validate([
            'endpoint' => ['required', 'string', 'url', 'max:4096'],
        ]);

        $push->unsubscribe($userId, $payload['endpoint']);

        return response()->json(['ok' => true]);
    }

    private function authenticatedUserId(Request $request): ?string
    {
        $user = $request->attributes->get('authUser');
        $id = is_object($user) ? ($user->id ?? null) : null;

        return is_string($id) && $id !== '' ? $id : null;
    }
}
