<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DiamanoPayService;
use App\Support\ModuleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Throwable;

final class SellerWalletController extends Controller
{
    public function __construct(private readonly DiamanoPayService $diamanoPay)
    {
    }

    public function bootstrap(Request $request): JsonResponse
    {
        if (! $this->canView($request)) {
            return response()->json(['error' => 'Cette action n’est pas autorisée pour votre rôle.'], 403);
        }

        $company = $this->company($request);
        $this->releaseMaturedFunds($company);
        $wallet = $this->wallet($company);

        return response()->json([
            'wallet' => $this->walletPayload($wallet),
            'withdrawals' => $this->withdrawals($company),
            'ledger' => $this->ledger($company),
        ]);
    }

    public function updatePayoutAccount(Request $request): JsonResponse
    {
        if (! $this->canModify($request)) {
            return response()->json(['error' => 'Cette action n’est pas autorisée pour votre rôle.'], 403);
        }

        $input = Validator::make($request->all(), [
            'provider' => ['required', 'in:WAVE'],
            'mobile' => ['required', 'string', 'min:8', 'max:40'],
            'beneficiaryName' => ['required', 'string', 'min:2', 'max:120'],
        ])->validate();

        $company = $this->company($request);
        $wallet = $this->wallet($company);
        DB::table('seller_wallets')->where('id', $wallet->id)->update([
            'payout_provider' => $input['provider'],
            'payout_mobile' => trim($input['mobile']),
            'payout_name' => trim($input['beneficiaryName']),
            'updated_at' => now(),
        ]);

        return response()->json($this->walletPayload($this->wallet($company)));
    }

    public function requestWithdrawal(Request $request): JsonResponse
    {
        if (! $this->canModify($request)) {
            return response()->json(['error' => 'Cette action n’est pas autorisée pour votre rôle.'], 403);
        }
        if (! $this->diamanoPay->isConfigured()) {
            return response()->json(['error' => 'Le retrait n’est pas encore activé par la configuration DiamanoPay.'], 503);
        }

        $input = Validator::make($request->all(), [
            'amount' => ['required', 'integer', 'min:1000'],
            'provider' => ['nullable', 'in:WAVE'],
            'mobile' => ['nullable', 'string', 'min:8', 'max:40'],
            'beneficiaryName' => ['nullable', 'string', 'min:2', 'max:120'],
            'idempotencyKey' => ['nullable', 'string', 'max:120'],
        ])->validate();

        $company = $this->company($request);
        $this->releaseMaturedFunds($company);
        $idempotencyKey = trim((string) ($request->header('Idempotency-Key') ?: ($input['idempotencyKey'] ?? '')));
        $created = null;
        $createdFresh = false;

        try {
            $created = DB::transaction(function () use ($company, $input, $idempotencyKey, &$createdFresh): object {
                $wallet = DB::table('seller_wallets')->where('company_id', $company)->lockForUpdate()->first();
                $existing = $idempotencyKey === ''
                    ? null
                    : DB::table('seller_withdrawals')->where('company_id', $company)->where('idempotency_key', $idempotencyKey)->first();
                if ($existing) {
                    return $existing;
                }
                if (! $wallet || (int) $wallet->available_balance < (int) $input['amount']) {
                    throw new \RuntimeException('SOLDE_INSUFFISANT');
                }

                $provider = $input['provider'] ?? $wallet->payout_provider;
                $mobile = trim((string) ($input['mobile'] ?? $wallet->payout_mobile));
                $name = trim((string) ($input['beneficiaryName'] ?? $wallet->payout_name));
                if ($mobile === '' || $name === '') {
                    throw new \RuntimeException('COMPTE_RETRAIT_INCOMPLET');
                }

                $id = 'withdrawal-'.Str::uuid();
                DB::table('seller_withdrawals')->insert([
                    'id' => $id,
                    'wallet_id' => $wallet->id,
                    'company_id' => $company,
                    'amount' => $input['amount'],
                    'fee' => 0,
                    'net_amount' => $input['amount'],
                    'provider' => $provider,
                    'mobile' => $mobile,
                    'beneficiary_name' => $name,
                    'status' => 'PROCESSING',
                    'provider_payout_id' => null,
                    'idempotency_key' => $idempotencyKey !== '' ? $idempotencyKey : null,
                    'failure_reason' => '',
                    'requested_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $createdFresh = true;
                DB::table('seller_wallets')->where('id', $wallet->id)->update([
                    'available_balance' => DB::raw('available_balance - '.(int) $input['amount']),
                    'reserved_balance' => DB::raw('reserved_balance + '.(int) $input['amount']),
                    'updated_at' => now(),
                ]);
                $this->ledgerInsert($wallet, 'WITHDRAWAL_RESERVED', 'AVAILABLE', 'DEBIT', (int) $input['amount'], $id, 'withdrawal:'.$id.':available');
                $this->ledgerInsert($wallet, 'WITHDRAWAL_RESERVED', 'RESERVED', 'CREDIT', (int) $input['amount'], $id, 'withdrawal:'.$id.':reserved');

                return DB::table('seller_withdrawals')->where('id', $id)->first();
            });
        } catch (Throwable $error) {
            return response()->json([
                'error' => match ($error->getMessage()) {
                    'SOLDE_INSUFFISANT' => 'Le solde disponible est insuffisant.',
                    'COMPTE_RETRAIT_INCOMPLET' => 'Configurez le nom et le numéro mobile de retrait avant de demander un retrait.',
                    default => 'La demande de retrait n’a pas pu être créée.',
                },
            ], in_array($error->getMessage(), ['SOLDE_INSUFFISANT', 'COMPTE_RETRAIT_INCOMPLET'], true) ? 422 : 400);
        }

        if ($created === null || ! $createdFresh) {
            return response()->json(['withdrawal' => $this->withdrawal($created)], 200);
        }

        try {
            $providerResponse = $this->diamanoPay->payout([
                'amount' => (int) $created->amount,
                'provider' => $created->provider,
                'mobile' => $created->mobile,
                'name' => $created->beneficiary_name,
            ], 'withdrawal:'.$created->id);
            $this->applyWithdrawalProviderStatus($created->id, $providerResponse);
        } catch (Throwable $error) {
            DB::transaction(function () use ($created): void {
                $withdrawal = DB::table('seller_withdrawals')->where('id', $created->id)->lockForUpdate()->first();
                if (! $withdrawal || $withdrawal->status !== 'PROCESSING') {
                    return;
                }
                $wallet = DB::table('seller_wallets')->where('id', $withdrawal->wallet_id)->lockForUpdate()->first();
                if ($wallet) {
                    $this->releaseReservedWithdrawal($wallet, $withdrawal, 'Le retrait DiamanoPay a échoué.');
                }
                DB::table('seller_withdrawals')->where('id', $withdrawal->id)->update([
                    'status' => 'FAILED',
                    'failure_reason' => 'Le retrait DiamanoPay a échoué.',
                    'processed_at' => now(),
                    'updated_at' => now(),
                ]);
            });
        }

        return response()->json(['withdrawal' => $this->withdrawal(DB::table('seller_withdrawals')->where('id', $created->id)->first())], 201);
    }

    public function webhook(Request $request): JsonResponse
    {
        $body = $request->getContent();
        if (! $this->diamanoPay->verifyWebhook($body, $request->header('X-Diamanopay-Signature'))) {
            return response()->json(['error' => 'Signature webhook invalide.'], 401);
        }

        $payload = json_decode($body, true);
        if (! is_array($payload)) {
            return response()->json(['error' => 'Payload webhook invalide.'], 422);
        }
        $data = is_array($payload['data'] ?? null) ? $payload['data'] : [];
        $providerId = trim((string) ($data['id'] ?? $data['payout_id'] ?? $data['payoutId'] ?? ''));
        $status = strtoupper((string) ($data['status'] ?? ''));
        if ($providerId === '') {
            return response()->json(['received' => true]);
        }

        $withdrawal = DB::table('seller_withdrawals')->where('provider_payout_id', $providerId)->first();
        if ($withdrawal) {
            try {
                $this->applyWithdrawalProviderStatus($withdrawal->id, $data);
            } catch (Throwable $error) {
                report($error);
                return response()->json(['error' => 'Le webhook de retrait n’a pas pu être traité.'], 500);
            }

            return response()->json(['received' => true]);
        }

        $order = DB::table('ecommerce_orders')->where('payment_charge_id', $providerId)->first();
        if (! $order) {
            return response()->json(['received' => true]);
        }

        try {
            DB::transaction(function () use ($order, $status, $data): void {
                $locked = DB::table('ecommerce_orders')->where('id', $order->id)->lockForUpdate()->first();
                if (! $locked) {
                    return;
                }
                if ($status === 'SUCCEEDED' && $locked->payment_status !== 'PAID') {
                    $this->creditPaidOrder($locked, $data);
                    DB::table('ecommerce_orders')->where('id', $locked->id)->update([
                        'payment_status' => 'PAID',
                        'paid_at' => now(),
                        'funds_available_at' => $locked->status === 'LIVRÉE' ? now() : now()->addDays(7),
                        'payment_failure_reason' => '',
                        'updated_at' => now(),
                    ]);
                } elseif (in_array($status, ['FAILED', 'CANCELLED'], true) && ! in_array($locked->payment_status, ['PAID', 'REFUNDED'], true)) {
                    DB::table('ecommerce_orders')->where('id', $locked->id)->update([
                        'payment_status' => 'FAILED',
                        'payment_failure_reason' => 'Le paiement DiamanoPay a échoué.',
                        'updated_at' => now(),
                    ]);
                    $this->restoreOrderStock($locked);
                }
            });
        } catch (Throwable $error) {
            report($error);
            return response()->json(['error' => 'Le webhook n’a pas pu être traité.'], 500);
        }

        return response()->json(['received' => true]);
    }

    private function applyWithdrawalProviderStatus(string $withdrawalId, array $providerResponse): void
    {
        $providerStatus = strtoupper((string) ($providerResponse['status'] ?? 'PENDING'));
        $providerId = trim((string) ($providerResponse['id'] ?? $providerResponse['payout_id'] ?? $providerResponse['payoutId'] ?? ''));
        $success = in_array($providerStatus, ['SUCCESS', 'SUCCEEDED', 'COMPLETED'], true);
        $failure = in_array($providerStatus, ['FAILED', 'CANCELLED', 'CANCELED', 'REJECTED', 'ERROR'], true);

        DB::transaction(function () use ($withdrawalId, $providerId, $success, $failure, $providerStatus): void {
            $withdrawal = DB::table('seller_withdrawals')->where('id', $withdrawalId)->lockForUpdate()->first();
            if (! $withdrawal || $withdrawal->status !== 'PROCESSING') {
                return;
            }
            $wallet = DB::table('seller_wallets')->where('id', $withdrawal->wallet_id)->lockForUpdate()->first();
            if (! $wallet) {
                throw new \RuntimeException('WALLET_NOT_FOUND');
            }

            if ($success) {
                DB::table('seller_wallets')->where('id', $wallet->id)->update([
                    'reserved_balance' => DB::raw('reserved_balance - '.(int) $withdrawal->amount),
                    'updated_at' => now(),
                ]);
                $this->ledgerInsert($wallet, 'WITHDRAWAL_PAID', 'RESERVED', 'DEBIT', (int) $withdrawal->amount, $withdrawal->id, 'withdrawal:'.$withdrawal->id.':paid');
                DB::table('seller_withdrawals')->where('id', $withdrawal->id)->update([
                    'status' => 'SUCCEEDED',
                    'provider_payout_id' => $providerId !== '' ? $providerId : $withdrawal->provider_payout_id,
                    'processed_at' => now(),
                    'updated_at' => now(),
                ]);
                return;
            }

            if ($failure) {
                $this->releaseReservedWithdrawal($wallet, $withdrawal, 'Le retrait DiamanoPay a échoué.');
                DB::table('seller_withdrawals')->where('id', $withdrawal->id)->update([
                    'status' => 'FAILED',
                    'provider_payout_id' => $providerId !== '' ? $providerId : $withdrawal->provider_payout_id,
                    'failure_reason' => 'Le retrait DiamanoPay a échoué ('.$providerStatus.').',
                    'processed_at' => now(),
                    'updated_at' => now(),
                ]);
                return;
            }

            DB::table('seller_withdrawals')->where('id', $withdrawal->id)->update([
                'status' => 'PROCESSING',
                'provider_payout_id' => $providerId !== '' ? $providerId : $withdrawal->provider_payout_id,
                'updated_at' => now(),
            ]);
        });
    }

    public function releaseOrderFunds(object $order): void
    {
        if ($order->payment_status !== 'PAID') {
            return;
        }
        $credit = DB::table('seller_wallet_ledger')
            ->where('company_id', $order->company_id)
            ->where('reference_type', 'ORDER')
            ->where('reference_id', $order->id)
            ->where('type', 'SALE_CREDIT')
            ->whereNull('released_at')
            ->whereNull('reversed_at')
            ->lockForUpdate()
            ->first();
        if (! $credit) {
            return;
        }

        $wallet = DB::table('seller_wallets')->where('id', $credit->wallet_id)->lockForUpdate()->first();
        if (! $wallet || (int) $wallet->pending_balance < (int) $credit->amount) {
            return;
        }
        DB::table('seller_wallets')->where('id', $wallet->id)->update([
            'pending_balance' => DB::raw('pending_balance - '.(int) $credit->amount),
            'available_balance' => DB::raw('available_balance + '.(int) $credit->amount),
            'updated_at' => now(),
        ]);
        DB::table('seller_wallet_ledger')->where('id', $credit->id)->update(['released_at' => now(), 'updated_at' => now()]);
        $this->ledgerInsert($wallet, 'SALE_RELEASE', 'AVAILABLE', 'CREDIT', (int) $credit->amount, $order->id, 'sale-release:'.$order->id);
    }

    public function reverseOrderFunds(object $order): void
    {
        if (! in_array($order->payment_status, ['PAID', 'REFUNDED'], true)) {
            return;
        }
        $credit = DB::table('seller_wallet_ledger')
            ->where('company_id', $order->company_id)
            ->where('reference_type', 'ORDER')
            ->where('reference_id', $order->id)
            ->where('type', 'SALE_CREDIT')
            ->whereNull('reversed_at')
            ->lockForUpdate()
            ->first();
        if (! $credit) {
            return;
        }
        $wallet = DB::table('seller_wallets')->where('id', $credit->wallet_id)->lockForUpdate()->first();
        if (! $wallet) {
            return;
        }
        $bucket = $credit->released_at ? 'AVAILABLE' : 'PENDING';
        $column = $bucket === 'AVAILABLE' ? 'available_balance' : 'pending_balance';
        DB::table('seller_wallets')->where('id', $wallet->id)->update([
            $column => DB::raw($column.' - '.(int) $credit->amount),
            'updated_at' => now(),
        ]);
        DB::table('seller_wallet_ledger')->where('id', $credit->id)->update(['reversed_at' => now(), 'updated_at' => now()]);
        $this->ledgerInsert($wallet, 'SALE_REVERSAL', $bucket, 'DEBIT', (int) $credit->amount, $order->id, 'sale-reversal:'.$order->id);
    }

    public function restoreOrderStock(object $order): void
    {
        if ($order->stock_restored_at !== null) {
            return;
        }
        $items = DB::table('ecommerce_order_items')->where('order_id', $order->id)->get();
        foreach ($items as $item) {
            if ($item->product_id) {
                DB::table('ecommerce_products')->where('id', $item->product_id)->increment('stock', (int) $item->quantity, ['updated_at' => now()]);
            }
        }
        DB::table('ecommerce_orders')->where('id', $order->id)->update(['stock_restored_at' => now(), 'updated_at' => now()]);
    }

    private function creditPaidOrder(object $order, array $data): void
    {
        $key = 'sale:'.$order->id;
        if (DB::table('seller_wallet_ledger')->where('company_id', $order->company_id)->where('idempotency_key', $key)->exists()) {
            return;
        }
        $wallet = $this->wallet($order->company_id);
        $available = $order->status === 'LIVRÉE';
        DB::table('seller_wallets')->where('id', $wallet->id)->update([
            $available ? 'available_balance' : 'pending_balance' => DB::raw(($available ? 'available_balance' : 'pending_balance').' + '.(int) $order->total),
            'total_credited' => DB::raw('total_credited + '.(int) $order->total),
            'updated_at' => now(),
        ]);
        $this->ledgerInsert($wallet, 'SALE_CREDIT', $available ? 'AVAILABLE' : 'PENDING', 'CREDIT', (int) $order->total, $order->id, $key, $available ? now() : now()->addDays(7), $data);
    }

    private function releaseMaturedFunds(string $company): void
    {
        DB::transaction(function () use ($company): void {
            $wallet = DB::table('seller_wallets')->where('company_id', $company)->lockForUpdate()->first();
            if (! $wallet) {
                return;
            }
            $credits = DB::table('seller_wallet_ledger')
                ->where('company_id', $company)
                ->where('type', 'SALE_CREDIT')
                ->where('bucket', 'PENDING')
                ->whereNull('released_at')
                ->whereNull('reversed_at')
                ->whereNotNull('available_at')
                ->where('available_at', '<=', now())
                ->lockForUpdate()
                ->get();
            foreach ($credits as $credit) {
                $order = DB::table('ecommerce_orders')->where('id', $credit->reference_id)->first();
                if ($order) {
                    $this->releaseOrderFunds($order);
                }
            }
        });
    }

    private function releaseReservedWithdrawal(object $wallet, object $withdrawal, string $reason): void
    {
        DB::table('seller_wallets')->where('id', $wallet->id)->update([
            'reserved_balance' => DB::raw('reserved_balance - '.(int) $withdrawal->amount),
            'available_balance' => DB::raw('available_balance + '.(int) $withdrawal->amount),
            'updated_at' => now(),
        ]);
        $this->ledgerInsert($wallet, 'WITHDRAWAL_RELEASED', 'RESERVED', 'DEBIT', (int) $withdrawal->amount, $withdrawal->id, 'withdrawal:'.$withdrawal->id.':release');
        $this->ledgerInsert($wallet, 'WITHDRAWAL_RELEASED', 'AVAILABLE', 'CREDIT', (int) $withdrawal->amount, $withdrawal->id, 'withdrawal:'.$withdrawal->id.':available');
    }

    private function ledgerInsert(object $wallet, string $type, string $bucket, string $direction, int $amount, string $referenceId, string $idempotencyKey, mixed $availableAt = null, ?array $metadata = null): void
    {
        if (DB::table('seller_wallet_ledger')->where('company_id', $wallet->company_id)->where('idempotency_key', $idempotencyKey)->exists()) {
            return;
        }
        DB::table('seller_wallet_ledger')->insert([
            'id' => 'ledger-'.Str::uuid(),
            'wallet_id' => $wallet->id,
            'company_id' => $wallet->company_id,
            'type' => $type,
            'bucket' => $bucket,
            'direction' => $direction,
            'amount' => $amount,
            'reference_type' => str_starts_with($type, 'SALE_') ? 'ORDER' : 'WITHDRAWAL',
            'reference_id' => $referenceId,
            'idempotency_key' => $idempotencyKey,
            'available_at' => $availableAt,
            'released_at' => null,
            'reversed_at' => null,
            'metadata' => $metadata ? json_encode($metadata, JSON_THROW_ON_ERROR) : null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function wallet(string $company): object
    {
        $wallet = DB::table('seller_wallets')->where('company_id', $company)->first();
        if ($wallet) {
            return $wallet;
        }
        $id = 'wallet-'.$company;
        DB::table('seller_wallets')->insert([
            'id' => $id,
            'company_id' => $company,
            'currency' => 'XOF',
            'pending_balance' => 0,
            'available_balance' => 0,
            'reserved_balance' => 0,
            'total_credited' => 0,
            'payout_provider' => 'WAVE',
            'payout_mobile' => '',
            'payout_name' => '',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return DB::table('seller_wallets')->where('id', $id)->first();
    }

    private function walletPayload(object $wallet): array
    {
        return [
            'companyId' => $wallet->company_id,
            'currency' => $wallet->currency,
            'pendingBalance' => (int) $wallet->pending_balance,
            'availableBalance' => (int) $wallet->available_balance,
            'reservedBalance' => (int) $wallet->reserved_balance,
            'totalCredited' => (int) $wallet->total_credited,
            'payoutProvider' => $wallet->payout_provider,
            'payoutMobile' => $wallet->payout_mobile,
            'payoutName' => $wallet->payout_name,
        ];
    }

    private function withdrawals(string $company): array
    {
        return DB::table('seller_withdrawals')->where('company_id', $company)->orderByDesc('created_at')->limit(50)->get()->map(fn (object $row): array => $this->withdrawal($row))->all();
    }

    private function withdrawal(?object $row): ?array
    {
        if (! $row) {
            return null;
        }
        return [
            'id' => $row->id,
            'amount' => (int) $row->amount,
            'fee' => (int) $row->fee,
            'netAmount' => (int) $row->net_amount,
            'provider' => $row->provider,
            'mobile' => $row->mobile,
            'beneficiaryName' => $row->beneficiary_name,
            'status' => $row->status,
            'providerPayoutId' => $row->provider_payout_id,
            'failureReason' => $row->failure_reason,
            'requestedAt' => $row->requested_at,
            'processedAt' => $row->processed_at,
        ];
    }

    private function ledger(string $company): array
    {
        return DB::table('seller_wallet_ledger')->where('company_id', $company)->orderByDesc('created_at')->limit(100)->get()->map(fn (object $row): array => [
            'id' => $row->id,
            'type' => $row->type,
            'bucket' => $row->bucket,
            'direction' => $row->direction,
            'amount' => (int) $row->amount,
            'referenceType' => $row->reference_type,
            'referenceId' => $row->reference_id,
            'availableAt' => $row->available_at,
            'releasedAt' => $row->released_at,
            'reversedAt' => $row->reversed_at,
            'createdAt' => $row->created_at,
        ])->all();
    }

    private function canView(Request $request): bool
    {
        $actor = $request->attributes->get('authActor');
        return is_array($actor) && ModuleAuthorization::allows($actor, 'ecommerce', 'view', 'finances');
    }

    private function canModify(Request $request): bool
    {
        $actor = $request->attributes->get('authActor');
        return is_array($actor) && ModuleAuthorization::allows($actor, 'ecommerce', 'modify', 'finances');
    }

    private function company(Request $request): string
    {
        return (string) $request->attributes->get('companyId');
    }
}