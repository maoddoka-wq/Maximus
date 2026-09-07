<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Payments\LedgerService;
use App\Services\Payments\PaymentService;
use App\Services\Payments\RefundService;
use App\Services\Payments\WithdrawalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PaymentController extends Controller
{
    public function index(Request $request, PaymentService $payments): JsonResponse
    {
        if (! $this->allowed($request, 'view')) {
            return $this->forbidden();
        }
        $tenant = $this->tenant($request);
        $rows = DB::table('payments')->where('tenant_id', $tenant)->orderByDesc('created_at')->limit(250)->get();

        return response()->json(['payments' => $rows->map(fn (object $payment): array => $payments->payload($payment))->values()]);
    }

    public function show(Request $request, string $id, PaymentService $payments): JsonResponse
    {
        if (! $this->allowed($request, 'view')) {
            return $this->forbidden();
        }
        $payment = $payments->getForTenant($this->tenant($request), $id);
        if (! $payment) {
            return response()->json(['error' => 'Paiement introuvable.'], 404);
        }

        return response()->json($payments->payload($payment));
    }

    public function create(Request $request, PaymentService $payments): JsonResponse
    {
        if (! $this->allowed($request, 'create')) {
            return $this->forbidden();
        }
        $input = Validator::make($request->all(), [
            'sourceModule' => ['required', 'string', 'max:80'],
            'sourceType' => ['required', 'string', 'max:100'],
            'sourceId' => ['required', 'string', 'max:160'],
            'customerId' => ['nullable', 'string', 'max:160'],
            'sellerId' => ['nullable', 'string', 'max:160'],
            'amount' => ['required', 'integer', 'min:1'],
            'currency' => ['required', 'string', 'size:3'],
            'paymentMethod' => ['nullable', 'string', 'max:80'],
            'description' => ['nullable', 'string', 'max:500'],
            'metadata' => ['nullable', 'array'],
            'idempotencyKey' => ['required', 'string', 'min:8', 'max:160'],
        ])->validate();

        $payload = $payments->create([
            'tenant_id' => $this->tenant($request),
            'source_module' => $input['sourceModule'],
            'source_type' => $input['sourceType'],
            'source_id' => $input['sourceId'],
            'customer_id' => $input['customerId'] ?? null,
            'seller_id' => $input['sellerId'] ?? $this->tenant($request),
            'amount' => $input['amount'],
            'currency' => strtoupper($input['currency']),
            'payment_method' => $input['paymentMethod'] ?? null,
            'description' => $input['description'] ?? '',
            'metadata' => $input['metadata'] ?? [],
            'idempotency_key' => $input['idempotencyKey'],
            'request_id' => $request->header('X-Request-Id'),
        ]);

        return response()->json($payload, 201);
    }

    public function refund(Request $request, string $id, PaymentService $payments, RefundService $refunds): JsonResponse
    {
        if (! $this->allowed($request, 'modify')) {
            return $this->forbidden();
        }
        $input = Validator::make($request->all(), [
            'amount' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', 'min:2', 'max:500'],
            'idempotencyKey' => ['required', 'string', 'min:8', 'max:160'],
        ])->validate();
        $payment = $payments->getForTenant($this->tenant($request), $id);
        if (! $payment) {
            return response()->json(['error' => 'Paiement introuvable.'], 404);
        }

        try {
            return response()->json($refunds->request($payment, (int) $input['amount'], $input['reason'], $input['idempotencyKey']), 202);
        } catch (\RuntimeException $exception) {
            return response()->json(['error' => $this->message($exception->getMessage())], 422);
        }
    }

    public function wallet(Request $request, LedgerService $ledger): JsonResponse
    {
        if (! $this->allowed($request, 'view')) {
            return $this->forbidden();
        }
        $tenant = $this->tenant($request);
        $sellerId = (string) ($request->query('sellerId') ?: $tenant);
        $currency = strtoupper((string) ($request->query('currency') ?: config('payments.currency', 'XOF')));
        $wallet = $ledger->wallet($tenant, 'SELLER', $sellerId, $currency);
        $entries = DB::table('ledger_entries')->where('tenant_id', $tenant)->where('wallet_id', $wallet->id)->orderByDesc('created_at')->limit(250)->get();

        return response()->json([
            'wallet' => [
                'id' => $wallet->id,
                'sellerId' => $wallet->owner_id,
                'currency' => $wallet->currency,
                'availableBalance' => (int) $wallet->available_balance,
                'pendingBalance' => (int) $wallet->pending_balance,
                'withdrawnBalance' => (int) $wallet->withdrawn_balance,
                'status' => $wallet->status,
            ],
            'transactions' => $entries->map(fn (object $entry): array => [
                'id' => $entry->id,
                'type' => $entry->type,
                'direction' => $entry->direction,
                'amount' => (int) $entry->amount,
                'currency' => $entry->currency,
                'reference' => $entry->reference,
                'description' => $entry->description,
                'status' => $entry->status,
                'createdAt' => $entry->created_at,
            ])->values(),
        ]);
    }

    public function payoutAccounts(Request $request, WithdrawalService $withdrawals): JsonResponse
    {
        if (! $this->allowed($request, 'view')) {
            return $this->forbidden();
        }
        $tenant = $this->tenant($request);
        $sellerId = (string) ($request->query('sellerId') ?: $tenant);
        $rows = DB::table('payout_accounts')->where('tenant_id', $tenant)->where('seller_id', $sellerId)->orderByDesc('created_at')->get();

        return response()->json(['accounts' => $rows->map(fn (object $account): array => $withdrawals->accountPayload($account))->values()]);
    }

    public function createPayoutAccount(Request $request, WithdrawalService $withdrawals): JsonResponse
    {
        if (! $this->allowed($request, 'modify')) {
            return $this->forbidden();
        }
        $input = Validator::make($request->all(), [
            'sellerId' => ['nullable', 'string', 'max:160'],
            'accountType' => ['required', 'string', 'max:40'],
            'operator' => ['nullable', 'string', 'max:80'],
            'accountNumber' => ['required', 'string', 'min:4', 'max:80'],
            'beneficiaryName' => ['required', 'string', 'min:2', 'max:160'],
            'country' => ['required', 'string', 'size:2'],
        ])->validate();
        $account = $withdrawals->createPayoutAccount([
            'tenant_id' => $this->tenant($request),
            'seller_id' => $input['sellerId'] ?? $this->tenant($request),
            'account_type' => $input['accountType'],
            'operator' => $input['operator'] ?? null,
            'account_number' => $input['accountNumber'],
            'beneficiary_name' => $input['beneficiaryName'],
            'country' => $input['country'],
        ]);

        return response()->json($account, 201);
    }

    public function withdrawals(Request $request, WithdrawalService $withdrawals): JsonResponse
    {
        if (! $this->allowed($request, 'view')) {
            return $this->forbidden();
        }
        $tenant = $this->tenant($request);
        $sellerId = (string) ($request->query('sellerId') ?: $tenant);
        $rows = DB::table('withdrawals')->where('tenant_id', $tenant)->where('seller_id', $sellerId)->orderByDesc('created_at')->limit(250)->get();

        return response()->json(['withdrawals' => $rows->map(fn (object $row): array => $this->withdrawalPayload($row))->values()]);
    }

    public function createWithdrawal(Request $request, WithdrawalService $withdrawals): JsonResponse
    {
        if (! $this->allowed($request, 'modify')) {
            return $this->forbidden();
        }
        $input = Validator::make($request->all(), [
            'sellerId' => ['nullable', 'string', 'max:160'],
            'payoutAccountId' => ['required', 'string', 'max:160'],
            'amount' => ['required', 'integer', 'min:1'],
            'fees' => ['sometimes', 'integer', 'min:0'],
            'currency' => ['required', 'string', 'size:3'],
            'idempotencyKey' => ['required', 'string', 'min:8', 'max:160'],
        ])->validate();
        try {
            return response()->json($withdrawals->request([
                'tenant_id' => $this->tenant($request),
                'seller_id' => $input['sellerId'] ?? $this->tenant($request),
                'payout_account_id' => $input['payoutAccountId'],
                'amount' => $input['amount'],
                'fees' => $input['fees'] ?? 0,
                'currency' => strtoupper($input['currency']),
                'idempotency_key' => $input['idempotencyKey'],
            ]), 202);
        } catch (\RuntimeException $exception) {
            return response()->json(['error' => $this->message($exception->getMessage())], 422);
        }
    }

    private function tenant(Request $request): string
    {
        return (string) $request->attributes->get('companyId');
    }

    private function allowed(Request $request, string $action): bool
    {
        $actor = $request->attributes->get('authActor');

        return is_array($actor) && \App\Support\ModuleAuthorization::allows($actor, 'finance', $action);
    }

    private function forbidden(): JsonResponse
    {
        return response()->json(['error' => 'Action Finance non autorisée.'], 403);
    }

    private function message(string $code): string
    {
        return match ($code) {
            'PAYMENT_NOT_REFUNDABLE' => 'Ce paiement ne peut pas être remboursé.',
            'REFUND_AMOUNT_EXCEEDED' => 'Le montant remboursé dépasserait le montant payé.',
            'PAYOUT_ACCOUNT_NOT_AVAILABLE' => 'Le compte de retrait est introuvable ou inactif.',
            'INSUFFICIENT_WALLET_BALANCE' => 'Le solde disponible est insuffisant.',
            default => 'L’opération financière ne peut pas être exécutée.',
        };
    }

    private function withdrawalPayload(object $row): array
    {
        return [
            'id' => $row->id,
            'sellerId' => $row->seller_id,
            'walletId' => $row->wallet_id,
            'payoutAccountId' => $row->payout_account_id,
            'amount' => (int) $row->amount,
            'fees' => (int) $row->fees,
            'netAmount' => (int) $row->net_amount,
            'currency' => $row->currency,
            'providerReference' => $row->provider_reference,
            'status' => $row->status,
            'failureReason' => $row->failure_reason,
            'requestedAt' => $row->requested_at,
            'processedAt' => $row->processed_at,
        ];
    }
}