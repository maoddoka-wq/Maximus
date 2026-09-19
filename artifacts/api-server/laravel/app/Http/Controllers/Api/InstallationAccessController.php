<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Services\InstallationAddressVerifier;
use App\Support\InstallationContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class InstallationAccessController extends Controller
{
    private function authorize(Request $request, string $companyId): void
    {
        abort_unless(InstallationContext::isCentral() && ($request->attributes->get('authActor')['role'] ?? null) === 'maximus_admin', 403);
        abort_unless(Company::query()->whereKey($companyId)->whereNull('deleted_at')->exists(), 404);
    }

    public function index(Request $request, string $companyId): JsonResponse
    {
        $this->authorize($request, $companyId);
        $rows = DB::table('maximus_installations')->where('company_id', $companyId)->orderBy('created_at')->get();
        return response()->json([
            'primaryInstallationId' => Company::query()->whereKey($companyId)->value('erp_installation_id'),
            'installations' => $rows->map(fn ($row) => [
                'id' => $row->id, 'mode' => $row->mode, 'status' => $row->status,
                'endpointUrl' => $row->endpoint_url, 'lastSeenAt' => $row->last_seen_at,
                'lastSyncAt' => $row->last_sync_at, 'configurationVersion' => (int) $row->configuration_version,
                'revokedAt' => $row->revoked_at,
                'addresses' => DB::table('maximus_installation_addresses')->where('installation_id', $row->id)->orderByDesc('is_primary')->orderBy('created_at')->get()->map(fn ($address) => self::addressPayload($address))->all(),
            ])->all(),
            'centralLoginUrl' => rtrim((string) config('maximus.central_public_url', config('app.url')), '/').'/',
        ]);
    }

    public function useAsPrimary(Request $request, string $companyId, string $installationId): JsonResponse
    {
        $this->authorize($request, $companyId);
        $request->validate(['confirmedReady' => ['required', 'boolean']]);
        if ($request->input('confirmedReady') !== true) {
            throw ValidationException::withMessages(['confirmedReady' => 'Confirmez explicitement que cette installation a été validée et est prête.']);
        }
        DB::transaction(function () use ($companyId, $installationId): void {
            $company = DB::table('companies')->where('id', $companyId)->lockForUpdate()->first();
            abort_unless($company && $company->status === 'ACTIF' && $company->deleted_at === null, 409, 'L’entreprise doit être active.');
            $installation = DB::table('maximus_installations')->where('id', $installationId)
                ->where('company_id', $companyId)->lockForUpdate()->first();
            abort_unless($installation, 404);
            abort_unless($installation->revoked_at === null && in_array($installation->status, ['READY', 'CONNECTED'], true)
                && in_array($installation->mode, ['dedicated', 'on_premise'], true), 409, 'Cette installation est indisponible.');
            $primary = DB::table('maximus_installation_addresses')->where('installation_id', $installationId)
                ->where('is_primary', true)->where('status', 'ACTIVE')->first();
            abort_unless($primary, 409, 'Activez et validez une adresse principale avant de basculer les utilisateurs.');
            DB::table('companies')->where('id', $companyId)->update(['erp_installation_id' => $installationId, 'updated_at' => now()]);
        });
        return response()->json(['ok' => true, 'primaryInstallationId' => $installationId]);
    }

    public function clearPrimary(Request $request, string $companyId): JsonResponse
    {
        $this->authorize($request, $companyId);
        DB::table('companies')->where('id', $companyId)->update(['erp_installation_id' => null, 'updated_at' => now()]);
        return response()->json(['ok' => true, 'primaryInstallationId' => null]);
    }

    public function store(Request $request, string $companyId, string $installationId, InstallationAddressVerifier $verifier): JsonResponse
    {
        $this->authorize($request, $companyId);
        $installation = $this->installation($companyId, $installationId);
        $input = $request->validate(['url' => ['required', 'string', 'max:500']]);
        $origin = $verifier->normalize($input['url'], $installation->mode);
        $id = 'erp-address-'.Str::uuid();
        DB::transaction(function () use ($origin, $installationId, $id): void {
            InstallationAddressVerifier::lockHostname($origin['local'] ? 'local:'.$installationId.':'.$origin['url'] : $origin['hostname']);
            DB::table('maximus_installations')->where('id', $installationId)->lockForUpdate()->first();
            $this->assertAvailable($origin['hostname'], $installationId, $origin['url'], $origin['local']);
            DB::table('maximus_installation_addresses')->insert([
                'id' => $id, 'installation_id' => $installationId, 'url' => $origin['url'], 'hostname' => $origin['hostname'],
                'status' => 'PENDING', 'is_primary' => false,
                'validation_method' => $origin['local'] ? 'local' : 'public',
                'verification_name' => $origin['local'] ? null : '_maximus-erp.'.$origin['hostname'],
                'verification_value' => $origin['local'] ? null : 'maximus-erp='.Str::random(48),
                'created_at' => now(), 'updated_at' => now(),
            ]);
        });
        return response()->json(['ok' => true, 'address' => self::addressPayload($this->address($installationId, $id))], 201);
    }

    public function verify(Request $request, string $companyId, string $installationId, string $addressId, InstallationAddressVerifier $verifier): JsonResponse
    {
        return $this->validateAddress($request, $companyId, $installationId, $addressId, $verifier, false);
    }

    public function activate(Request $request, string $companyId, string $installationId, string $addressId, InstallationAddressVerifier $verifier): JsonResponse
    {
        return $this->validateAddress($request, $companyId, $installationId, $addressId, $verifier, true);
    }

    private function validateAddress(Request $request, string $companyId, string $installationId, string $addressId, InstallationAddressVerifier $verifier, bool $activate): JsonResponse
    {
        $this->authorize($request, $companyId);
        $installation = $this->installation($companyId, $installationId);
        $address = $this->address($installationId, $addressId);
        $this->assertAvailable($address->hostname, $installationId, $address->url, $address->validation_method === 'local', $addressId);
        try {
            $verifier->verify($address, $installation);
        } catch (Throwable $error) {
            $message = $error instanceof \RuntimeException ? $error->getMessage() : 'Échec de la vérification DNS/HTTPS.';
            DB::table('maximus_installation_addresses')->where('id', $addressId)->update([
                'status' => 'ERROR', 'last_error' => $message, 'verified_at' => null, 'updated_at' => now(),
            ]);
            $this->bump($installationId);
            return response()->json(['ok' => false, 'error' => $message, 'address' => self::addressPayload($this->address($installationId, $addressId))], 422);
        }
        DB::transaction(function () use ($installationId, $addressId, $activate): void {
            $installation = DB::table('maximus_installations')->where('id', $installationId)->lockForUpdate()->first();
            abort_if($installation->revoked_at !== null || $installation->status === 'REVOKED', 409, 'Installation révoquée.');
            $address = $this->address($installationId, $addressId);
            if ($activate) {
                DB::table('maximus_installation_addresses')->where('installation_id', $installationId)->update(['is_primary' => false]);
            }
            DB::table('maximus_installation_addresses')->where('id', $addressId)->update([
                'status' => $activate || $address->status === 'ACTIVE' ? 'ACTIVE' : 'VERIFIED',
                'is_primary' => $activate || (bool) $address->is_primary,
                'verified_at' => $address->validation_method === 'public' ? now() : null,
                'last_error' => null, 'updated_at' => now(),
            ]);
            if ($activate) {
                DB::table('maximus_installations')->where('id', $installationId)->update(['endpoint_url' => $address->url]);
            }
            $this->bump($installationId);
        });
        return response()->json(['ok' => true, 'address' => self::addressPayload($this->address($installationId, $addressId))]);
    }

    public function destroy(Request $request, string $companyId, string $installationId, string $addressId): JsonResponse
    {
        $this->authorize($request, $companyId);
        $this->installation($companyId, $installationId, true);
        DB::transaction(function () use ($installationId, $addressId): void {
            $installation = DB::table('maximus_installations')->where('id', $installationId)->lockForUpdate()->first();
            $address = $this->address($installationId, $addressId);
            $revoked = $installation->revoked_at !== null || $installation->status === 'REVOKED';
            abort_if($address->is_primary && !$revoked, 409, 'Activez une autre adresse principale avant de supprimer celle-ci.');
            if ($address->is_primary || ($revoked && $installation->endpoint_url === $address->url)) {
                DB::table('maximus_installations')->where('id', $installationId)->update(['endpoint_url' => null, 'updated_at' => now()]);
            }
            DB::table('maximus_installation_addresses')->where('id', $addressId)->delete();
            $this->bump($installationId);
        });
        return response()->json(['ok' => true]);
    }

    private function installation(string $companyId, string $id, bool $allowRevoked = false): object
    {
        $row = DB::table('maximus_installations')->where('id', $id)->where('company_id', $companyId)->first();
        abort_unless($row, 404);
        abort_if(!$allowRevoked && ($row->revoked_at !== null || $row->status === 'REVOKED' || !in_array($row->mode, ['dedicated', 'on_premise'], true)), 409, 'Installation indisponible.');
        return $row;
    }

    private function address(string $installationId, string $id): object
    {
        $row = DB::table('maximus_installation_addresses')->where('id', $id)->where('installation_id', $installationId)->first();
        abort_unless($row, 404);
        return $row;
    }

    private function assertAvailable(string $hostname, string $installationId, string $url, bool $local, ?string $except = null): void
    {
        if ($local) {
            $exists = DB::table('maximus_installation_addresses')->where('installation_id', $installationId)
                ->where('url', $url)->when($except, fn ($query) => $query->where('id', '!=', $except))->exists();
            if ($exists) {
                throw ValidationException::withMessages(['url' => 'Cette adresse locale est déjà configurée pour cette installation.']);
            }
            return;
        }
        $exists = DB::table('maximus_installation_addresses')->where('hostname', $hostname)->where('validation_method', 'public')
            ->when($except, fn ($query) => $query->where('id', '!=', $except))->exists();
        $shop = DB::table('ecommerce_domains')->whereRaw('lower(domain) = ?', [$hostname])->exists();
        $central = strtolower((string) parse_url((string) config('maximus.central_public_url'), PHP_URL_HOST));
        if ($exists || $shop || ($central !== '' && $hostname === $central) || in_array($hostname, InstallationContext::trustedHosts(), true)) {
            throw ValidationException::withMessages(['url' => 'Ce nom d’hôte est déjà réservé à un accès ERP, central ou boutique.']);
        }
    }

    private function bump(string $installationId): void
    {
        DB::table('maximus_installations')->where('id', $installationId)->increment('configuration_version', 1, ['updated_at' => now()]);
    }

    public static function addressPayload(object $row): array
    {
        return [
            'id' => $row->id, 'installationId' => $row->installation_id, 'url' => $row->url,
            'hostname' => $row->hostname, 'status' => $row->status, 'isPrimary' => (bool) $row->is_primary,
            'verificationName' => $row->verification_name, 'verificationValue' => $row->verification_value,
            'lastError' => $row->last_error, 'verifiedAt' => $row->verified_at,
            'validationMethod' => $row->validation_method,
        ];
    }
}