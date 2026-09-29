<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ModuleProductImageStorage;
use App\Support\ModuleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

final class CommerceProductImageController extends Controller
{
    public function storeNew(Request $request, string $productId, ModuleProductImageStorage $images): JsonResponse
    {
        return $this->store($request, $productId, 'create', $images);
    }

    public function replace(Request $request, string $productId, ModuleProductImageStorage $images): JsonResponse
    {
        return $this->store($request, $productId, 'modify', $images);
    }

    public function show(Request $request, string $productId, ModuleProductImageStorage $images)
    {
        if (! $this->allowed($request, 'view')) {
            return response()->json(['error' => 'Permission Gestion commerciale insuffisante.'], 403);
        }

        return $images->response('commerce', $this->company($request), $productId);
    }

    private function store(
        Request $request,
        string $productId,
        string $action,
        ModuleProductImageStorage $images,
    ): JsonResponse {
        if (! $this->allowed($request, $action)) {
            return response()->json(['error' => 'Permission Gestion commerciale insuffisante.'], 403);
        }
        $company = $this->company($request);
        if ($action === 'create' && $images->exists('commerce', $company, $productId)) {
            return response()->json(['error' => 'Une photo existe déjà pour ce produit.'], 409);
        }

        $input = Validator::make($request->all(), [
            'image' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
        ])->validate();

        $imageUrl = $images->store('commerce', $company, $productId, $input['image']);

        return response()->json(['imageUrl' => $imageUrl]);
    }

    private function allowed(Request $request, string $action): bool
    {
        $actor = $request->attributes->get('authActor');

        return is_array($actor)
            && ModuleAuthorization::allows($actor, 'commerce', $action, 'products');
    }

    private function company(Request $request): string
    {
        $companyId = (string) $request->attributes->get('companyId');

        if ($companyId === '') {
            abort(403);
        }

        return $companyId;
    }
}