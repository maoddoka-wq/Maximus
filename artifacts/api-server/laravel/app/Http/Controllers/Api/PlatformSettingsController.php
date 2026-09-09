<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SellerWalletFeePolicy;
use App\Services\SellerWalletMaturityPolicy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class PlatformSettingsController extends Controller
{
    public function __construct(
        private readonly SellerWalletMaturityPolicy $maturityPolicy,
        private readonly SellerWalletFeePolicy $feePolicy,
    ) {}

    public function sellerWalletMaturity(Request $request): JsonResponse
    {
        if (! $this->isMaximusAdmin($request)) {
            return response()->json(['error' => 'Cette configuration est réservée à l’administration MAXIMUS.'], 403);
        }

        return response()->json($this->maturityPolicy->payload());
    }

    public function updateSellerWalletMaturity(Request $request): JsonResponse
    {
        if (! $this->isMaximusAdmin($request)) {
            return response()->json(['error' => 'Cette configuration est réservée à l’administration MAXIMUS.'], 403);
        }

        $input = $request->validate([
            'mode' => ['required', 'string', 'in:AUTOMATIC,DAYS,WEEKS'],
            'value' => ['nullable', 'integer', 'min:1', 'max:3650'],
        ]);

        if ($input['mode'] !== SellerWalletMaturityPolicy::MODE_AUTOMATIC && ! array_key_exists('value', $input)) {
            return response()->json(['error' => 'Indiquez une valeur pour le délai choisi.'], 422);
        }

        return response()->json($this->maturityPolicy->payloadFor(
            $this->maturityPolicy->update($input['mode'], $input['value'] ?? null),
        ));
    }

    public function sellerWalletWithdrawalFee(Request $request): JsonResponse
    {
        if (! $this->isMaximusAdmin($request)) {
            return response()->json(['error' => 'Cette configuration est réservée à l’administration MAXIMUS.'], 403);
        }

        return response()->json($this->feePolicy->payload());
    }

    public function updateSellerWalletWithdrawalFee(Request $request): JsonResponse
    {
        if (! $this->isMaximusAdmin($request)) {
            return response()->json(['error' => 'Cette configuration est réservée à l’administration MAXIMUS.'], 403);
        }

        $input = $request->validate([
            'amount' => ['required', 'integer', 'min:0', 'max:1000000'],
        ]);

        return response()->json([
            ...$this->feePolicy->update((int) $input['amount']),
            'label' => sprintf('Frais de retrait : %d XOF par opération.', (int) $input['amount']),
        ]);
    }

    private function isMaximusAdmin(Request $request): bool
    {
        return ($request->attributes->get('authActor')['role'] ?? null) === 'maximus_admin';
    }
}
