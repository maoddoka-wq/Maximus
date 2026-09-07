<?php

return [
    'provider' => env('PAYMENT_PROVIDER', 'diamanopay'),
    'currency' => env('PAYMENT_DEFAULT_CURRENCY', 'XOF'),
    'callback_url' => env('DIAMANOPAY_CALLBACK_URL', ''),
    'webhook_url' => env('DIAMANOPAY_WEBHOOK_URL', ''),
    'diamanopay' => [
        'base_url' => rtrim((string) env('DIAMANOPAY_BASE_URL', ''), '/'),
        'client_id' => env('DIAMANOPAY_CLIENT_ID'),
        'client_secret' => env('DIAMANOPAY_CLIENT_SECRET'),
        'access_token' => env('DIAMANOPAY_ACCESS_TOKEN'),
        'auth_path' => env('DIAMANOPAY_AUTH_PATH', '/oauth2/token'),
        'payment_path' => env('DIAMANOPAY_PAYMENT_PATH', '/api/charges'),
        'verify_path' => env('DIAMANOPAY_VERIFY_PATH', '/api/transaction/{providerTransactionId}'),
        'refund_path' => env('DIAMANOPAY_REFUND_PATH', '/api/payout/refund/{providerTransactionId}'),
        'payout_path' => env('DIAMANOPAY_PAYOUT_PATH', '/api/payout'),
        'timeout' => (int) env('DIAMANOPAY_TIMEOUT', 15),
    ],
];