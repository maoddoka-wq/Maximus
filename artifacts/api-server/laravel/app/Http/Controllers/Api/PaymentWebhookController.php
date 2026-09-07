<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentWebhookController extends Controller
{
    public function diamanopay(Request $request, PaymentService $payments): JsonResponse
    {
        $raw = $request->getContent();
        $payload = json_decode($raw, true);
        if (! is_array($payload) || ! isset($payload['status'], $payload['transactionId'])) {
            return response()->json(['error' => 'Payload webhook invalide.'], 422);
        }
        Log::info('[DIAMANOPAY] Webhook received', [
            'status' => $payload['status'],
            'transaction_id' => $payload['transactionId'],
            'payment_request_id' => $payload['paymentRequestId'] ?? null,
        ]);
        $eventId = (string) ($request->header('X-DiamanoPay-Event-Id')
            ?: ($payload['event_id'] ?? $payload['eventId'] ?? null)
            ?: implode(':', [
                'diamanopay',
                (string) $payload['transactionId'],
                (string) ($payload['paymentRequestId'] ?? ''),
                (string) $payload['status'],
            ]));
        if ($eventId === '') {
            return response()->json(['error' => 'Identifiant d’événement absent.'], 422);
        }

        try {
            return response()->json($payments->confirmFromWebhook(
                $payload,
                'diamanopay',
                $eventId,
                null,
            ));
        } catch (\RuntimeException $exception) {
            $status = in_array($exception->getMessage(), ['PAYMENT_NOT_FOUND'], true) ? 404 : 422;
            return response()->json(['error' => 'Webhook non traité.', 'code' => $exception->getMessage()], $status);
        }
    }
}