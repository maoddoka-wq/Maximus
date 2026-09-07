<?php

return [
    'provider' => env('PAYMENT_PROVIDER', 'diamanopay'),
    'currency' => env('PAYMENT_DEFAULT_CURRENCY', 'XOF'),
    'callback_url' => env('DIAMANOPAY_CALLBACK_URL', ''),
    'diamanopay' => [
        'base_url' => rtrim((string) env('DIAMANOPAY_BASE_URL', ''), '/'),
        'client_id' => env('DIAMANOPAY_CLIENT_ID'),
        'client_secret' => env('DIAMANOPAY_CLIENT_SECRET'),
        'access_token' => env('DIAMANOPAY_ACCESS_TOKEN'),
        'webhook_secret' => env('DIAMANOPAY_WEBHOOK_SECRET'),
        'auth_path' => env('DIAMANOPAY_AUTH_PATH', '/oauth/token'),
        'payment_path' => env('DIAMANOPAY_PAYMENT_PATH', '/payments'),
        'verify_path' => env('DIAMANOPAY_VERIFY_PATH', '/payments/{providerTransactionId}'),
        'refund_path' => env('DIAMANOPAY_REFUND_PATH', '/refunds'),
        'payout_path' => env('DIAMANOPAY_PAYOUT_PATH', '/payouts'),
        'timeout' => (int) env('DIAMANOPAY_TIMEOUT', 15),
    ],
];