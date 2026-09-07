<?php

namespace App\Http\Controllers\Api;

use App\Contracts\PaymentProviderInterface;
use App\Http\Controllers\Controller;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentWebhookController extends Controller
{
    public function diamanopay(Request $request, PaymentProviderInterface $provider, PaymentService $payments): JsonResponse
    {
        $raw = $request->getContent();
        if (! $provider->verifyWebhook($raw, $request->header('X-DiamanoPay-Signature'))) {
            return response()->json(['error' => 'Signature de webhook invalide.'], 401);
        }

        $payload = json_decode($raw, true);
        if (! is_array($payload)) {
            return response()->json(['error' => 'Payload webhook invalide.'], 422);
        }
        $eventId = (string) ($request->header('X-DiamanoPay-Event-Id') ?: ($payload['event_id'] ?? $payload['eventId'] ?? ''));
        if ($eventId === '') {
            return response()->json(['error' => 'Identifiant d’événement absent.'], 422);
        }

        try {
            return response()->json($payments->confirmFromWebhook(
                $payload,
                'diamanopay',
                $eventId,
                $request->header('X-DiamanoPay-Signature'),
            ));
        } catch (\RuntimeException $exception) {
            $status = in_array($exception->getMessage(), ['PAYMENT_NOT_FOUND'], true) ? 404 : 422;
            return response()->json(['error' => 'Webhook non traité.', 'code' => $exception->getMessage()], $status);
        }
    }
}