<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

final class CompanyPublicSiteSettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $companyId = $this->companyId($request);
        if ($companyId instanceof JsonResponse) {
            return $companyId;
        }

        return response()->json(['store' => $this->storePayload($this->ensureStore($companyId))]);
    }

    public function update(Request $request): JsonResponse
    {
        $companyId = $this->companyId($request);
        if ($companyId instanceof JsonResponse) {
            return $companyId;
        }

        $input = Validator::make($request->all(), [
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'slug' => ['required', 'string', 'min:3', 'max:80', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
            'status' => ['required', 'in:DRAFT,PUBLISHED,SUSPENDED'],
        ])->validate();

        $store = $this->ensureStore($companyId);
        $slug = $this->uniqueSlug($input['slug'], (string) $store->id);
        DB::table('ecommerce_stores')
            ->where('id', $store->id)
            ->where('company_id', $companyId)
            ->update([
                'name' => $input['name'],
                'slug' => $slug,
                'status' => $input['status'],
                'updated_at' => now(),
            ]);

        return response()->json([
            'store' => $this->storePayload(
                DB::table('ecommerce_stores')->where('id', $store->id)->first(),
            ),
        ]);
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $companyId = $this->companyId($request);
        if ($companyId instanceof JsonResponse) {
            return $companyId;
        }

        $input = Validator::make($request->all(), [
            'image' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ])->validate();
        $contents = $input['image']->get();
        if (! is_string($contents) || $contents === '') {
            return response()->json(['error' => 'Le logo n’a pas pu être lu après son envoi.'], 500);
        }

        $store = $this->ensureStore($companyId);
        $filename = Str::uuid()->toString().'.'.strtolower($input['image']->getClientOriginalExtension() ?: 'bin');
        $logoUrl = '/api/store-logos/'.rawurlencode($companyId).'/'.rawurlencode($filename);
        DB::table('ecommerce_stores')
            ->where('id', $store->id)
            ->where('company_id', $companyId)
            ->update([
                'logo_url' => $logoUrl,
                'logo_data' => base64_encode($contents),
                'logo_mime' => $input['image']->getMimeType() ?: 'application/octet-stream',
                'updated_at' => now(),
            ]);

        return response()->json([
            'store' => $this->storePayload(DB::table('ecommerce_stores')->where('id', $store->id)->first()),
        ]);
    }

    private function companyId(Request $request): string|JsonResponse
    {
        $actor = $request->attributes->get('authActor');
        $companyId = is_array($actor) && ($actor['role'] ?? null) === 'company_admin'
            ? ($actor['companyId'] ?? null)
            : null;
        if (! is_string($companyId) || $companyId === '') {
            return response()->json(['error' => 'Seul un administrateur de l’entreprise peut modifier le site public.'], 403);
        }

        return $companyId;
    }

    private function ensureStore(string $companyId): object
    {
        $existing = DB::table('ecommerce_stores')
            ->where('company_id', $companyId)
            ->orderBy('created_at')
            ->orderBy('id')
            ->first();
        if ($existing) {
            return $existing;
        }

        $company = DB::table('companies')->where('id', $companyId)->first(['name']);
        $name = trim((string) ($company->name ?? ''));
        if ($name === '') {
            $name = 'Entreprise '.Str::headline($companyId);
        }

        $baseSlug = Str::slug($name);
        if ($baseSlug === '') {
            $baseSlug = 'entreprise';
        }
        $slug = $this->uniqueSlug($baseSlug, '');
        $store = [
            'id' => 'ecommerce-store-'.$companyId,
            'company_id' => $companyId,
            'slug' => $slug,
            'name' => $name,
            'description' => '',
            'status' => 'DRAFT',
            'currency' => 'XOF',
            'primary_color' => '#D69E2E',
            'accent_color' => '#172033',
            'logo_url' => '',
            'created_at' => now(),
            'updated_at' => now(),
        ];
        DB::table('ecommerce_stores')->insert($store);

        return (object) $store;
    }

    private function uniqueSlug(string $requested, string $ignoreId): string
    {
        $base = Str::slug(trim($requested));
        if ($base === '') {
            $base = 'entreprise';
        }

        $slug = $base;
        $suffix = 2;
        while (DB::table('ecommerce_stores')
            ->where('slug', $slug)
            ->when($ignoreId !== '', fn ($query) => $query->where('id', '!=', $ignoreId))
            ->exists()) {
            $slug = $base.'-'.$suffix++;
        }

        return $slug;
    }

    private function storePayload(?object $store): array
    {
        if (! $store) {
            abort(500, 'Les paramètres du site public n’ont pas pu être chargés.');
        }

        return [
            'id' => (string) $store->id,
            'companyId' => (string) $store->company_id,
            'slug' => (string) $store->slug,
            'name' => (string) $store->name,
            'description' => (string) ($store->description ?? ''),
            'status' => (string) $store->status,
            'currency' => (string) ($store->currency ?? 'XOF'),
            'primaryColor' => (string) ($store->primary_color ?? '#D69E2E'),
            'accentColor' => (string) ($store->accent_color ?? '#172033'),
            'logoUrl' => (string) ($store->logo_url ?? ''),
            'heroImages' => json_decode((string) ($store->hero_images ?? '[]'), true) ?: [],
            'allowOrderAttachments' => (bool) ($store->allow_order_attachments ?? false),
        ];
    }
}