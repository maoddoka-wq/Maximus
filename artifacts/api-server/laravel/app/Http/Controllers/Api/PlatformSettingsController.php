<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\EcommerceCommissionPolicy;
use App\Services\PublicRegistrationPolicy;
use App\Services\SellerWalletFeePolicy;
use App\Services\SellerWalletMaturityPolicy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class PlatformSettingsController extends Controller
{
    public function __construct(
        private readonly SellerWalletMaturityPolicy $maturityPolicy,
        private readonly SellerWalletFeePolicy $feePolicy,
        private readonly EcommerceCommissionPolicy $commissionPolicy,
        private readonly PublicRegistrationPolicy $registrationPolicy,
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

        return response()->json($this->feePolicy->payload(
            $this->feePolicy->update((int) $input['amount']),
        ));
    }

    public function ecommerceCommission(Request $request): JsonResponse
    {
        if (! $this->isMaximusAdmin($request)) {
            return response()->json(['error' => 'Cette configuration est réservée à l’administration MAXIMUS.'], 403);
        }

        return response()->json($this->commissionPolicy->payload());
    }

    public function publicRegistration(Request $request): JsonResponse
    {
        if (! $this->isMaximusAdmin($request)) {
            return response()->json(['error' => 'Cette configuration est réservée à l’administration MAXIMUS.'], 403);
        }

        return response()->json($this->registrationPolicy->payload());
    }

    public function updatePublicRegistration(Request $request): JsonResponse
    {
        if (! $this->isMaximusAdmin($request)) {
            return response()->json(['error' => 'Cette configuration est réservée à l’administration MAXIMUS.'], 403);
        }

        $input = $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);

        return response()->json($this->registrationPolicy->update((bool) $input['enabled']));
    }

    public function updateEcommerceCommission(Request $request): JsonResponse
    {
        if (! $this->isMaximusAdmin($request)) {
            return response()->json(['error' => 'Cette configuration est réservée à l’administration MAXIMUS.'], 403);
        }

        $input = $request->validate([
            'providerPercent' => ['required', 'integer', 'min:0', 'max:100'],
            'maximusPercent' => ['required', 'integer', 'min:0', 'max:100'],
        ]);
        if ((int) $input['providerPercent'] + (int) $input['maximusPercent'] > 100) {
            return response()->json(['error' => 'La commission totale ne peut pas dépasser 100 %.'], 422);
        }

        return response()->json($this->commissionPolicy->payloadForUpdate(
            (int) $input['providerPercent'],
            (int) $input['maximusPercent'],
        ));
    }

    private function isMaximusAdmin(Request $request): bool
    {
        return ($request->attributes->get('authActor')['role'] ?? null) === 'maximus_admin';
    }
}
