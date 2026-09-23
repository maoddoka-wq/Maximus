<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\CompanyRegistry;
use App\Support\ModuleAuthorization;
use App\Support\ModuleCatalog;
use App\Services\EcommerceDomainVerifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ImmobilierController extends Controller
{
    private const LISTING_STATUSES = ['DRAFT', 'PUBLISHED', 'RESERVED', 'SOLD', 'RENTED', 'ARCHIVED'];
    private const PROPERTY_STATUSES = ['AVAILABLE', 'RESERVED', 'SOLD', 'RENTED', 'ARCHIVED'];
    private const PROPERTY_TYPES = ['APPARTEMENT', 'MAISON', 'VILLA', 'TERRAIN', 'BUREAU', 'LOCAL_COMMERCIAL'];
    private const TRANSACTION_TYPES = ['SALE', 'RENT'];
    private const LEAD_STATUSES = ['NEW', 'CONTACTED', 'CLOSED'];

    public function __construct(
        private readonly EcommerceDomainVerifier $domainVerifier,
    ) {
    }

    public function bootstrap(Request $request): JsonResponse
    {
        if (! $this->allows($request, 'view')) {
            return $this->forbidden();
        }

        $company = $this->company($request);

        return response()->json([
            'properties' => DB::table('immobilier_properties')
                ->where('company_id', $company)
                ->where('status', '!=', 'ARCHIVED')
                ->orderByDesc('updated_at')
                ->get()
                ->map(fn (object $row): array => $this->property($row))
                ->values(),
            'listings' => DB::table('immobilier_listings')
                ->where('company_id', $company)
                ->where('status', '!=', 'ARCHIVED')
                ->orderByDesc('featured')
                ->orderByDesc('updated_at')
                ->get()
                ->map(fn (object $row): array => $this->listing($row))
                ->values(),
            'leads' => DB::table('immobilier_leads as leads')
                ->leftJoin('immobilier_listings as listings', 'listings.id', '=', 'leads.listing_id')
                ->where('leads.company_id', $company)
                ->orderByDesc('leads.created_at')
                ->get([
                    'leads.*',
                    'listings.title as listing_title',
                ])
                ->map(fn (object $row): array => $this->lead($row))
                ->values(),
        ]);
    }

    public function storeProperty(Request $request): JsonResponse
    {
        if (! $this->allows($request, 'create', 'biens')) {
            return $this->forbidden();
        }

        $input = $this->propertyInput($request);
        $company = $this->company($request);
        $row = [
            'id' => $this->id('property'),
            'company_id' => $company,
            'reference' => $this->uniqueReference($company, $input['reference'] ?? null),
            ...$input,
            'created_at' => now(),
            'updated_at' => now(),
        ];
        DB::table('immobilier_properties')->insert($row);

        return response()->json(['property' => $this->property((object) $row)], 201);
    }

    public function updateProperty(Request $request, string $id): JsonResponse
    {
        if (! $this->allows($request, 'modify', 'biens')) {
            return $this->forbidden();
        }

        $company = $this->company($request);
        $existing = DB::table('immobilier_properties')->where('company_id', $company)->where('id', $id)->first();
        if (! $existing) {
            return response()->json(['error' => 'Bien introuvable.'], 404);
        }
        $input = $this->propertyInput($request, true);
        if (array_key_exists('reference', $input)) {
            $input['reference'] = $this->uniqueReference($company, $input['reference'], $id);
        }
        $input['updated_at'] = now();
        DB::table('immobilier_properties')->where('company_id', $company)->where('id', $id)->update($input);

        $property = DB::table('immobilier_properties')->where('company_id', $company)->where('id', $id)->first();
        $this->syncLegacyListingFields($property);

        return response()->json(['property' => $this->property($property)]);
    }

    public function uploadPropertyMedia(Request $request, string $id): JsonResponse
    {
        if (! $this->allows($request, 'modify', 'biens')) {
            return $this->forbidden();
        }

        $company = $this->company($request);
        $property = DB::table('immobilier_properties')
            ->where('company_id', $company)
            ->where('id', $id)
            ->where('status', '!=', 'ARCHIVED')
            ->first();
        if (! $property) {
            return response()->json(['error' => 'Bien introuvable.'], 404);
        }

        $this->storeMedia($request, $company, 'immobilier_property', $id);

        return response()->json([
            'property' => $this->property($property),
        ]);
    }

    public function archiveProperty(Request $request, string $id): JsonResponse
    {
        if (! $this->allows($request, 'modify', 'biens')) {
            return $this->forbidden();
        }

        $company = $this->company($request);
        $updated = DB::table('immobilier_properties')
            ->where('company_id', $company)
            ->where('id', $id)
            ->update(['status' => 'ARCHIVED', 'updated_at' => now()]);
        if ($updated) {
            DB::table('immobilier_listings')
                ->where('company_id', $company)
                ->where('property_id', $id)
                ->update(['status' => 'ARCHIVED', 'updated_at' => now()]);
        }

        return $updated
            ? response()->json(['ok' => true])
            : response()->json(['error' => 'Bien introuvable.'], 404);
    }

    public function storeListing(Request $request): JsonResponse
    {
        if (! $this->allows($request, 'create', 'annonces')) {
            return $this->forbidden();
        }

        $input = $this->listingInput($request);
        $company = $this->company($request);
        $property = DB::table('immobilier_properties')
            ->where('company_id', $company)
            ->where('id', $input['property_id'])
            ->where('status', '!=', 'ARCHIVED')
            ->first();
        if (! $property) {
            return response()->json(['error' => 'Sélectionnez un bien actif pour créer cette annonce.'], 422);
        }
        $slug = $this->uniqueSlug($company, $input['title']);
        $row = [
            'id' => $this->id('listing'),
            'company_id' => $company,
            'property_id' => $property->id,
            'property_type' => $property->property_type,
            'transaction_type' => $property->transaction_type,
            'city' => $property->city,
            'neighborhood' => $property->neighborhood,
            'address' => $property->address,
            'price' => $property->price,
            'area_m2' => $property->area_m2,
            'bedrooms' => $property->bedrooms,
            'bathrooms' => $property->bathrooms,
            'furnished' => $property->furnished,
            ...$input,
            'slug' => $slug,
            'created_at' => now(),
            'updated_at' => now(),
        ];
        DB::table('immobilier_listings')->insert($row);

        return response()->json(['listing' => $this->listing((object) $row)], 201);
    }

    public function updateListing(Request $request, string $id): JsonResponse
    {
        if (! $this->allows($request, 'modify', 'annonces')) {
            return $this->forbidden();
        }

        $company = $this->company($request);
        $existing = DB::table('immobilier_listings')->where('company_id', $company)->where('id', $id)->first();
        if (! $existing) {
            return response()->json(['error' => 'Annonce introuvable.'], 404);
        }
        $input = $this->listingInput($request, true);
        if (array_key_exists('title', $input) && $input['title'] !== $existing->title) {
            $input['slug'] = $this->uniqueSlug($company, $input['title'], $id);
        }
        $input['updated_at'] = now();
        DB::table('immobilier_listings')->where('company_id', $company)->where('id', $id)->update($input);

        return response()->json(['listing' => $this->listing(DB::table('immobilier_listings')->where('id', $id)->where('company_id', $company)->first())]);
    }

    public function uploadListingMedia(Request $request, string $id): JsonResponse
    {
        if (! $this->allows($request, 'modify', 'annonces')) {
            return $this->forbidden();
        }

        $company = $this->company($request);
        $listing = DB::table('immobilier_listings')
            ->where('company_id', $company)
            ->where('id', $id)
            ->where('status', '!=', 'ARCHIVED')
            ->first();
        if (! $listing) {
            return response()->json(['error' => 'Annonce introuvable.'], 404);
        }

        $this->storeMedia($request, $company, 'immobilier_listing', $id);

        return response()->json([
            'listing' => $this->listing($listing),
        ]);
    }

    public function archiveListing(Request $request, string $id): JsonResponse
    {
        if (! $this->allows($request, 'modify', 'annonces')) {
            return $this->forbidden();
        }

        $company = $this->company($request);
        $updated = DB::table('immobilier_listings')->where('company_id', $company)->where('id', $id)->update(['status' => 'ARCHIVED', 'updated_at' => now()]);
        return $updated ? response()->json(['ok' => true]) : response()->json(['error' => 'Annonce introuvable.'], 404);
    }

    public function updateLead(Request $request, string $id): JsonResponse
    {
        if (! $this->allows($request, 'modify', 'prospects')) {
            return $this->forbidden();
        }

        $input = Validator::make($request->all(), ['status' => ['required', 'in:NEW,CONTACTED,CLOSED']])->validate();
        $company = $this->company($request);
        $updated = DB::table('immobilier_leads')->where('company_id', $company)->where('id', $id)->update(['status' => $input['status'], 'updated_at' => now()]);
        return $updated ? response()->json(['ok' => true]) : response()->json(['error' => 'Demande introuvable.'], 404);
    }

    public function publicLead(Request $request, string $slug): JsonResponse
    {
        $store = DB::table('ecommerce_stores')->where('slug', $slug)->where('status', 'PUBLISHED')->first();
        return $this->createPublicLead($request, $store);
    }

    public function publicDomainLead(Request $request): JsonResponse
    {
        $domain = $this->domainVerifier->activeForHost($request->getHost());
        $store = $domain ? DB::table('ecommerce_stores')->where('company_id', $domain->company_id)->where('status', 'PUBLISHED')->first() : null;
        return $this->createPublicLead($request, $store);
    }

    private function createPublicLead(Request $request, ?object $store): JsonResponse
    {
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
        }
        if (! ModuleCatalog::allowsFeature((string) $store->company_id, 'immobilier', 'vitrine-publique')) {
            return response()->json(['error' => 'La vitrine immobilière n’est pas activée pour cette boutique.'], 403);
        }

        $input = Validator::make($request->all(), [
            'listingId' => ['nullable', 'string', 'max:160'],
            'requestType' => ['required', 'in:CONTACT,VISIT'],
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['required', 'email', 'max:160'],
            'phone' => ['nullable', 'string', 'max:40'],
            'preferredDate' => ['nullable', 'date', 'after_or_equal:today'],
            'message' => ['nullable', 'string', 'max:1000'],
        ])->validate();
        $listingId = $input['listingId'] ?? null;
        if ($listingId !== null && ! DB::table('immobilier_listings')->where('id', $listingId)->where('company_id', $store->company_id)->where('status', 'PUBLISHED')->exists()) {
            return response()->json(['error' => 'Cette annonce n’est plus disponible.'], 422);
        }
        $row = [
            'id' => $this->id('lead'),
            'company_id' => $store->company_id,
            'listing_id' => $listingId,
            'request_type' => $input['requestType'],
            'status' => 'NEW',
            'name' => trim($input['name']),
            'email' => Str::lower(trim($input['email'])),
            'phone' => trim((string) ($input['phone'] ?? '')),
            'preferred_date' => $input['preferredDate'] ?? null,
            'message' => trim((string) ($input['message'] ?? '')),
            'created_at' => now(),
            'updated_at' => now(),
        ];
        DB::table('immobilier_leads')->insert($row);
        return response()->json(['lead' => ['id' => $row['id'], 'status' => 'NEW']], 201);
    }

    private function propertyInput(Request $request, bool $partial = false): array
    {
        $rules = [
            'reference' => ['sometimes', 'nullable', 'string', 'max:60'],
            'propertyType' => [$partial ? 'sometimes' : 'required', 'in:'.implode(',', self::PROPERTY_TYPES)],
            'transactionType' => [$partial ? 'sometimes' : 'required', 'in:'.implode(',', self::TRANSACTION_TYPES)],
            'status' => [$partial ? 'sometimes' : 'required', 'in:'.implode(',', self::PROPERTY_STATUSES)],
            'city' => [$partial ? 'sometimes' : 'required', 'string', 'min:2', 'max:100'],
            'neighborhood' => ['nullable', 'string', 'max:120'],
            'address' => ['nullable', 'string', 'max:240'],
            'price' => [$partial ? 'sometimes' : 'required', 'integer', 'min:0'],
            'areaM2' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'bedrooms' => ['nullable', 'integer', 'min:0', 'max:50'],
            'bathrooms' => ['nullable', 'integer', 'min:0', 'max:50'],
            'furnished' => ['sometimes', 'boolean'],
            'internalNotes' => ['nullable', 'string', 'max:5000'],
        ];
        $input = Validator::make($request->all(), $rules)->validate();
        return [
            ...(array_key_exists('reference', $input) && filled($input['reference']) ? ['reference' => strtoupper(trim($input['reference']))] : []),
            ...(array_key_exists('propertyType', $input) ? ['property_type' => $input['propertyType']] : []),
            ...(array_key_exists('transactionType', $input) ? ['transaction_type' => $input['transactionType']] : []),
            ...(array_key_exists('status', $input) ? ['status' => $input['status']] : []),
            ...(array_key_exists('city', $input) ? ['city' => trim($input['city'])] : []),
            ...(array_key_exists('neighborhood', $input) ? ['neighborhood' => trim((string) ($input['neighborhood'] ?? ''))] : []),
            ...(array_key_exists('address', $input) ? ['address' => trim((string) ($input['address'] ?? ''))] : []),
            ...(array_key_exists('price', $input) ? ['price' => (int) $input['price']] : []),
            ...(array_key_exists('areaM2', $input) ? ['area_m2' => $input['areaM2'] === null ? null : (int) $input['areaM2']] : []),
            ...(array_key_exists('bedrooms', $input) ? ['bedrooms' => $input['bedrooms'] === null ? null : (int) $input['bedrooms']] : []),
            ...(array_key_exists('bathrooms', $input) ? ['bathrooms' => $input['bathrooms'] === null ? null : (int) $input['bathrooms']] : []),
            ...(array_key_exists('furnished', $input) ? ['furnished' => (bool) $input['furnished']] : []),
            ...(array_key_exists('internalNotes', $input) ? ['internal_notes' => trim((string) ($input['internalNotes'] ?? ''))] : []),
        ];
    }

    private function listingInput(Request $request, bool $partial = false): array
    {
        $input = Validator::make($request->all(), [
            'propertyId' => [$partial ? 'sometimes' : 'required', 'string', 'max:160'],
            'title' => [$partial ? 'sometimes' : 'required', 'string', 'min:3', 'max:160'],
            'status' => [$partial ? 'sometimes' : 'required', 'in:'.implode(',', self::LISTING_STATUSES)],
            'description' => ['nullable', 'string', 'max:5000'],
            'featured' => ['sometimes', 'boolean'],
        ])->validate();

        return [
            ...(array_key_exists('propertyId', $input) ? ['property_id' => $input['propertyId']] : []),
            ...(array_key_exists('title', $input) ? ['title' => trim($input['title'])] : []),
            ...(array_key_exists('status', $input) ? ['status' => $input['status']] : []),
            ...(array_key_exists('description', $input) ? ['description' => trim((string) ($input['description'] ?? ''))] : []),
            ...(array_key_exists('featured', $input) ? ['featured' => (bool) $input['featured']] : []),
        ];
    }

    private function property(object $row): array
    {
        return [
            'id' => $row->id,
            'companyId' => $row->company_id,
            'reference' => $row->reference,
            'propertyType' => $row->property_type,
            'transactionType' => $row->transaction_type,
            'status' => $row->status,
            'city' => $row->city,
            'neighborhood' => $row->neighborhood ?? '',
            'address' => $row->address ?? '',
            'price' => (int) $row->price,
            'areaM2' => $row->area_m2 === null ? null : (int) $row->area_m2,
            'bedrooms' => $row->bedrooms === null ? null : (int) $row->bedrooms,
            'bathrooms' => $row->bathrooms === null ? null : (int) $row->bathrooms,
            'furnished' => (bool) $row->furnished,
            'internalNotes' => $row->internal_notes ?? '',
            'gallery' => $this->gallery((string) $row->company_id, 'immobilier_property', (string) $row->id),
            'createdAt' => (string) $row->created_at,
            'updatedAt' => (string) $row->updated_at,
        ];
    }

    private function listing(object $row): array
    {
        return [
            'id' => $row->id,
            'companyId' => $row->company_id,
            'propertyId' => $row->property_id,
            'title' => $row->title,
            'slug' => $row->slug,
            'propertyType' => $row->property_type,
            'transactionType' => $row->transaction_type,
            'status' => $row->status,
            'description' => $row->description ?? '',
            'city' => $row->city,
            'neighborhood' => $row->neighborhood ?? '',
            'address' => $row->address ?? '',
            'price' => (int) $row->price,
            'areaM2' => $row->area_m2 === null ? null : (int) $row->area_m2,
            'bedrooms' => $row->bedrooms === null ? null : (int) $row->bedrooms,
            'bathrooms' => $row->bathrooms === null ? null : (int) $row->bathrooms,
            'furnished' => (bool) $row->furnished,
            'featured' => (bool) $row->featured,
            'gallery' => $this->gallery((string) $row->company_id, 'immobilier_listing', (string) $row->id),
            'createdAt' => (string) $row->created_at,
            'updatedAt' => (string) $row->updated_at,
        ];
    }

    private function storeMedia(Request $request, string $company, string $ownerType, string $ownerId): void
    {
        $input = Validator::make($request->all(), [
            'media' => ['required', 'array', 'min:1', 'max:20'],
            'media.*' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,mp4,webm,mov,ogg', 'max:51200'],
        ])->validate();

        $nextOrder = (int) DB::table('ecommerce_gallery_images')
            ->where('company_id', $company)
            ->where('owner_type', $ownerType)
            ->where('owner_id', $ownerId)
            ->where('collection', 'gallery')
            ->max('sort_order') + 1;

        foreach ($input['media'] as $file) {
            $contents = $file->get();
            if (! is_string($contents) || $contents === '') {
                continue;
            }
            DB::table('ecommerce_gallery_images')->insert([
                'id' => $this->id('gallery'),
                'company_id' => $company,
                'owner_type' => $ownerType,
                'owner_id' => $ownerId,
                'collection' => 'gallery',
                'image_data' => base64_encode($contents),
                'image_mime' => $file->getMimeType() ?: 'application/octet-stream',
                'sort_order' => $nextOrder++,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    private function gallery(string $company, string $ownerType, string $ownerId): array
    {
        return DB::table('ecommerce_gallery_images')
            ->where('company_id', $company)
            ->where('owner_type', $ownerType)
            ->where('owner_id', $ownerId)
            ->where('collection', 'gallery')
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get(['id', 'image_mime'])
            ->map(fn (object $row): array => [
                'id' => (string) $row->id,
                'url' => '/api/gallery-images/'.rawurlencode($company).'/'.rawurlencode((string) $row->id),
                'mime' => (string) ($row->image_mime ?? 'application/octet-stream'),
                'type' => str_starts_with((string) ($row->image_mime ?? ''), 'video/') ? 'video' : 'image',
            ])
            ->values()
            ->all();
    }

    private function lead(object $row): array
    {
        return [
            'id' => $row->id,
            'listingId' => $row->listing_id,
            'listingTitle' => $row->listing_title ?? null,
            'requestType' => $row->request_type,
            'status' => $row->status,
            'name' => $row->name,
            'email' => $row->email,
            'phone' => $row->phone ?? '',
            'preferredDate' => $row->preferred_date,
            'message' => $row->message ?? '',
            'createdAt' => (string) $row->created_at,
        ];
    }

    private function company(Request $request): string
    {
        return (string) $request->attributes->get('companyId');
    }

    private function allows(Request $request, string $action, ?string $feature = null): bool
    {
        return ModuleAuthorization::allows(
            (array) $request->attributes->get('authActor', []),
            'immobilier',
            $action,
            $feature,
        );
    }

    private function syncLegacyListingFields(object $property): void
    {
        DB::table('immobilier_listings')
            ->where('company_id', $property->company_id)
            ->where('property_id', $property->id)
            ->update([
                'property_type' => $property->property_type,
                'transaction_type' => $property->transaction_type,
                'city' => $property->city,
                'neighborhood' => $property->neighborhood,
                'address' => $property->address,
                'price' => $property->price,
                'area_m2' => $property->area_m2,
                'bedrooms' => $property->bedrooms,
                'bathrooms' => $property->bathrooms,
                'furnished' => $property->furnished,
                'updated_at' => now(),
            ]);
    }

    private function uniqueReference(string $company, ?string $requested = null, ?string $ignore = null): string
    {
        $base = strtoupper(trim((string) $requested));
        if ($base === '') {
            $base = 'BIEN-'.strtoupper(Str::random(6));
        }
        $reference = $base;
        $index = 2;
        while (DB::table('immobilier_properties')
            ->where('company_id', $company)
            ->where('reference', $reference)
            ->when($ignore, fn ($query) => $query->where('id', '!=', $ignore))
            ->exists()) {
            $reference = $base.'-'.$index++;
        }
        return $reference;
    }

    private function uniqueSlug(string $company, string $title, ?string $ignore = null): string
    {
        $base = Str::slug($title) ?: 'annonce';
        $slug = $base;
        $index = 2;
        while (DB::table('immobilier_listings')->where('company_id', $company)->where('slug', $slug)->when($ignore, fn ($query) => $query->where('id', '!=', $ignore))->exists()) {
            $slug = $base.'-'.$index++;
        }
        return $slug;
    }

    private function id(string $prefix): string
    {
        return $prefix.'-'.Str::lower(Str::random(18));
    }

    private function forbidden(): JsonResponse
    {
        return response()->json(['error' => 'Vous n’avez pas les droits pour cette opération immobilière.'], 403);
    }
}