<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthUser;
use App\Support\CompanyRegistry;
use App\Support\EcommerceCustomerAuth;
use App\Support\ModuleCatalog;
use App\Support\ModuleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TransportController extends Controller
{
    private const DRIVER_STATUSES = ['ACTIVE', 'INACTIVE'];
    private const VEHICLE_STATUSES = ['AVAILABLE', 'ON_TRIP', 'MAINTENANCE'];
    private const TRIP_STATUSES = ['REQUESTED', 'OFFERED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    private const CUSTOMER_CANCELLABLE_TRIP_STATUSES = ['REQUESTED', 'OFFERED', 'ASSIGNED'];
    private const DEFAULT_SETTINGS = [
        'gpsValidityMinutes' => 5,
        'trackingIntervalSeconds' => 10,
        'baseFare' => 500,
        'pricePerKm' => 300,
    ];
    private const DAKAR_BOUNDS = [
        'minLatitude' => 14.55,
        'maxLatitude' => 14.95,
        'minLongitude' => -17.65,
        'maxLongitude' => -16.95,
    ];

    public function bootstrap(Request $request): JsonResponse
    {
        if (! $this->allowed($request, 'view')) {
            return $this->forbidden();
        }

        $company = $this->company($request);
        $drivers = DB::table('transport_drivers')->where('company_id', $company)->orderBy('name')->get();
        $vehicles = DB::table('transport_vehicles')->where('company_id', $company)->orderBy('registration')->get();
        $trips = DB::table('transport_trips')->where('company_id', $company)->orderByDesc('requested_at')->limit(250)->get();
        $actor = $request->attributes->get('authActor');
        if (($actor['role'] ?? null) === 'employee') {
            $driver = $drivers->firstWhere('employee_id', $actor['employeeId'] ?? null);
            $drivers = $driver ? collect([$driver]) : collect();
            $vehicles = $driver
                ? $vehicles->where('driver_id', $driver->id)->values()
                : collect();
            $trips = $driver
                ? $trips->where('driver_id', $driver->id)->values()
                : collect();
        }
        $driverIds = $trips->pluck('driver_id')->filter()->unique()->values()->all();
        $tripDrivers = empty($driverIds)
            ? collect()
            : DB::table('transport_drivers')
                ->where('company_id', $company)
                ->whereIn('id', $driverIds)
                ->get()
                ->keyBy('id');
        $today = now()->startOfDay()->toDateTimeString();

        return response()->json([
            'drivers' => $drivers->map(fn ($row) => $this->driver($row))->values(),
            'vehicles' => $vehicles->map(fn ($row) => $this->vehicle($row))->values(),
            'trips' => $trips->map(fn ($row) => $this->trip($row, $row->driver_id ? $tripDrivers->get($row->driver_id) : null))->values(),
            'metrics' => [
                'activeDrivers' => $drivers->where('status', 'ACTIVE')->count(),
                'availableVehicles' => $vehicles->where('status', 'AVAILABLE')->count(),
                'todayTrips' => $trips->filter(fn ($row) => $row->requested_at && $row->requested_at >= $today)->count(),
                'todayRevenue' => $trips
                    ->filter(fn ($row) => $row->status === 'COMPLETED' && $row->requested_at && $row->requested_at >= $today)
                    ->sum('fare'),
            ],
            'settings' => $this->transportSettings($company),
        ]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        if (! $this->allowed($request, 'modify', 'parametres')) {
            return $this->forbidden();
        }

        $input = $this->validated($request, [
            'gpsValidityMinutes' => ['required', 'integer', 'min:1', 'max:60'],
            'trackingIntervalSeconds' => ['sometimes', 'integer', 'in:10'],
            'baseFare' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
            'pricePerKm' => ['sometimes', 'integer', 'min:1', 'max:1000000'],
            'heroImageData' => ['sometimes', 'nullable', 'string', 'max:4194304'],
        ]);
        $company = $this->company($request);
        $module = DB::table('maximus_company_modules')
            ->where('company_id', $company)
            ->where('module_id', 'transport')
            ->first();
        $configuration = json_decode($module->configuration ?? '{}', true);
        $configuration = is_array($configuration) ? $configuration : [];
        $transportConfiguration = is_array($configuration['transport'] ?? null)
            ? $configuration['transport']
            : [];
        $baseFare = array_key_exists('baseFare', $input)
            ? (int) $input['baseFare']
            : (int) ($transportConfiguration['baseFare'] ?? self::DEFAULT_SETTINGS['baseFare']);
        $pricePerKm = array_key_exists('pricePerKm', $input)
            ? (int) $input['pricePerKm']
            : (int) ($transportConfiguration['pricePerKm'] ?? self::DEFAULT_SETTINGS['pricePerKm']);
        $configuration['transport'] = [
            ...$transportConfiguration,
            'gpsValidityMinutes' => (int) $input['gpsValidityMinutes'],
            'trackingIntervalSeconds' => 10,
            'baseFare' => $baseFare,
            'pricePerKm' => $pricePerKm,
        ];
        if (array_key_exists('heroImageData', $input)) {
            if ($input['heroImageData'] === null || trim((string) $input['heroImageData']) === '') {
                unset($configuration['transport']['heroImageData'], $configuration['transport']['heroImageMime']);
            } else {
                $image = $this->decodeImageData((string) $input['heroImageData']);
                if ($image === null) {
                    return response()->json(['error' => 'Ajoutez une image JPG, PNG ou WebP valide de 2 Mo maximum.'], 422);
                }
                $configuration['transport']['heroImageData'] = base64_encode($image['contents']);
                $configuration['transport']['heroImageMime'] = $image['mime'];
            }
        }
        DB::table('maximus_company_modules')
            ->where('company_id', $company)
            ->where('module_id', 'transport')
            ->update([
                'configuration' => json_encode($configuration, JSON_UNESCAPED_UNICODE),
                'updated_at' => now(),
            ]);

        return response()->json($this->transportSettings($company));
    }

    public function createDriver(Request $request): JsonResponse
    {
        if (! $this->allowed($request, 'create', 'drivers')) {
            return $this->forbidden();
        }

        $input = $this->validated($request, [
            'licenseNumber' => ['required', 'string', 'max:80'],
            'employeeId' => ['required', 'string', 'max:120'],
            'status' => ['sometimes', Rule::in(self::DRIVER_STATUSES)],
        ]);
        $company = $this->company($request);
        $employeeId = trim($input['employeeId']);
        $employee = AuthUser::query()
            ->where('employee_id', $employeeId)
            ->where('company_id', $company)
            ->where('status', 'ACTIF')
            ->first();
        if (! $employee) {
            return response()->json(['error' => 'Le chauffeur doit être un employé actif de cette entreprise, créé dans Organisation.'], 422);
        }
        if (DB::table('transport_drivers')
            ->where('company_id', $company)
            ->where('employee_id', $employeeId)
            ->exists()) {
            return response()->json(['error' => 'Ce compte est déjà lié à un chauffeur.'], 422);
        }
        $row = [
            'id' => $this->id('driver'),
            'company_id' => $company,
            'name' => trim((string) $employee->display_name),
            'phone' => trim((string) ($employee->phone ?? '')),
            'license_number' => trim($input['licenseNumber']),
            'employee_id' => $employeeId,
            'status' => $input['status'] ?? 'ACTIVE',
            'created_at' => now(),
            'updated_at' => now(),
        ];
        DB::table('transport_drivers')->insert($row);

        return response()->json($this->driver((object) $row), 201);
    }

    public function updateDriverLocation(Request $request, string $id): JsonResponse
    {
        if (! $this->allowed($request, 'modify', 'drivers') && ! $this->allowed($request, 'modify', 'trips')) {
            return $this->forbidden();
        }

        $input = $this->validated($request, [
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);
        $company = $this->company($request);
        $driver = DB::table('transport_drivers')
            ->where('id', $id)
            ->where('company_id', $company)
            ->first();
        if (! $driver) {
            return response()->json(['error' => 'Chauffeur introuvable.'], 404);
        }

        $actor = $request->attributes->get('authActor');
        if (($actor['role'] ?? null) === 'employee' && ($driver->employee_id ?? null) !== ($actor['employeeId'] ?? null)) {
            return response()->json(['error' => 'Vous ne pouvez mettre à jour que votre propre position.'], 403);
        }
        if (($actor['role'] ?? null) === 'employee' && empty($driver->employee_id)) {
            return response()->json(['error' => 'Votre compte n’est pas encore lié à un profil chauffeur.'], 403);
        }

        DB::table('transport_drivers')->where('id', $id)->update([
            'latitude' => (float) $input['latitude'],
            'longitude' => (float) $input['longitude'],
            'location_updated_at' => now(),
            'updated_at' => now(),
        ]);

        $activeTrips = DB::table('transport_trips')
            ->where('company_id', $company)
            ->where('driver_id', $id)
            ->whereIn('status', ['ASSIGNED', 'IN_PROGRESS'])
            ->where(function ($query): void {
                $query->whereNull('pickup_route_updated_at')
                    ->orWhere('pickup_route_updated_at', '<', now()->subSeconds(15));
            })
            ->get();
        foreach ($activeTrips as $activeTrip) {
            if ($activeTrip->pickup_latitude === null || $activeTrip->pickup_longitude === null) {
                continue;
            }
            try {
                $route = $this->calculateRouteCoordinates(
                    [(float) $input['longitude'], (float) $input['latitude']],
                    [(float) $activeTrip->pickup_longitude, (float) $activeTrip->pickup_latitude],
                );
                DB::table('transport_trips')->where('id', $activeTrip->id)->update([
                    'pickup_route_distance_km' => $route['distanceKm'],
                    'pickup_eta_minutes' => $route['durationMinutes'],
                    'pickup_route_geometry' => json_encode($route['geometry'], JSON_THROW_ON_ERROR),
                    'pickup_route_updated_at' => now(),
                    'updated_at' => now(),
                ]);
            } catch (\Throwable) {
                // Keep the last valid route when the routing provider is temporarily unavailable.
            }
        }

        return response()->json($this->driver(DB::table('transport_drivers')->where('id', $id)->first()));
    }

    public function createVehicle(Request $request): JsonResponse
    {
        if (! $this->allowed($request, 'create', 'vehicles')) {
            return $this->forbidden();
        }

        $input = $this->validated($request, [
            'registration' => ['required', 'string', 'max:30'],
            'model' => ['required', 'string', 'max:80'],
            'vehicleType' => ['required', 'string', 'max:50'],
            'driverId' => ['required', 'string', 'max:120'],
            'status' => ['sometimes', Rule::in(self::VEHICLE_STATUSES)],
            'imageData' => ['required', 'string', 'max:4194304'],
        ]);
        $image = $this->decodeImageData($input['imageData']);
        if ($image === null) {
            return response()->json(['error' => 'Ajoutez une image JPG, PNG ou WebP valide de 2 Mo maximum.'], 422);
        }
        $company = $this->company($request);
        $driverId = trim($input['driverId']);
        if (! DB::table('transport_drivers')
            ->where('id', $driverId)
            ->where('company_id', $company)
            ->where('status', 'ACTIVE')
            ->exists()) {
            return response()->json(['error' => 'Un chauffeur actif doit être sélectionné pour ce véhicule.'], 422);
        }
        if (DB::table('transport_vehicles')
            ->where('company_id', $company)
            ->where('driver_id', $driverId)
            ->exists()) {
            return response()->json(['error' => 'Ce chauffeur possède déjà un véhicule.'], 422);
        }
        $registration = strtoupper(trim($input['registration']));
        if (DB::table('transport_vehicles')->where('company_id', $company)->whereRaw('upper(registration) = ?', [$registration])->exists()) {
            return response()->json(['error' => 'Cette immatriculation existe déjà dans cette entreprise.'], 422);
        }
        $row = [
            'id' => $this->id('vehicle'),
            'company_id' => $company,
            'registration' => $registration,
            'model' => trim($input['model']),
            'vehicle_type' => trim($input['vehicleType']),
            'driver_id' => $driverId,
            'status' => $input['status'] ?? 'AVAILABLE',
            'image_data' => base64_encode($image['contents']),
            'image_mime' => $image['mime'],
            'created_at' => now(),
            'updated_at' => now(),
        ];
        DB::table('transport_vehicles')->insert($row);

        return response()->json($this->vehicle((object) $row), 201);
    }

    public function updateVehicle(Request $request, string $id): JsonResponse
    {
        if (! $this->allowed($request, 'modify', 'vehicles')) {
            return $this->forbidden();
        }

        $input = $this->validated($request, [
            'registration' => ['required', 'string', 'max:30'],
            'model' => ['required', 'string', 'max:80'],
            'vehicleType' => ['required', 'string', 'max:50'],
            'driverId' => ['required', 'string', 'max:120'],
            'status' => ['required', Rule::in(self::VEHICLE_STATUSES)],
            'imageData' => ['sometimes', 'nullable', 'string', 'max:4194304'],
        ]);
        $company = $this->company($request);
        $vehicle = DB::table('transport_vehicles')
            ->where('company_id', $company)
            ->where('id', $id)
            ->first();
        if (! $vehicle) {
            return response()->json(['error' => 'Véhicule introuvable.'], 404);
        }

        $driverId = trim($input['driverId']);
        if (! DB::table('transport_drivers')
            ->where('id', $driverId)
            ->where('company_id', $company)
            ->where('status', 'ACTIVE')
            ->exists()) {
            return response()->json(['error' => 'Un chauffeur actif doit être sélectionné pour ce véhicule.'], 422);
        }
        if (DB::table('transport_vehicles')
            ->where('company_id', $company)
            ->where('driver_id', $driverId)
            ->where('id', '!=', $id)
            ->exists()) {
            return response()->json(['error' => 'Ce chauffeur possède déjà un autre véhicule.'], 422);
        }

        $registration = strtoupper(trim($input['registration']));
        if (DB::table('transport_vehicles')
            ->where('company_id', $company)
            ->whereRaw('upper(registration) = ?', [$registration])
            ->where('id', '!=', $id)
            ->exists()) {
            return response()->json(['error' => 'Cette immatriculation existe déjà dans cette entreprise.'], 422);
        }

        $activeTrip = DB::table('transport_trips')
            ->where('company_id', $company)
            ->where('vehicle_id', $id)
            ->whereIn('status', ['ASSIGNED', 'IN_PROGRESS'])
            ->first();
        if ($activeTrip && $input['status'] !== 'ON_TRIP') {
            return response()->json(['error' => 'Ce véhicule est lié à une course en cours et doit rester marqué « En course ».'], 422);
        }
        if (! $activeTrip && $input['status'] === 'ON_TRIP') {
            return response()->json(['error' => 'Un véhicule ne peut être marqué « En course » sans course active.'], 422);
        }

        $updates = [
            'registration' => $registration,
            'model' => trim($input['model']),
            'vehicle_type' => trim($input['vehicleType']),
            'driver_id' => $driverId,
            'status' => $input['status'],
            'updated_at' => now(),
        ];
        if (array_key_exists('imageData', $input)) {
            if ($input['imageData'] === null) {
                $updates['image_data'] = null;
                $updates['image_mime'] = null;
            } else {
                $image = $this->decodeImageData($input['imageData']);
                if ($image === null) {
                    return response()->json(['error' => 'Ajoutez une image JPG, PNG ou WebP valide de 2 Mo maximum.'], 422);
                }
                $updates['image_data'] = base64_encode($image['contents']);
                $updates['image_mime'] = $image['mime'];
            }
        }

        DB::table('transport_vehicles')->where('id', $id)->where('company_id', $company)->update($updates);

        return response()->json($this->vehicle(DB::table('transport_vehicles')->where('id', $id)->where('company_id', $company)->first()));
    }

    public function deleteVehicle(Request $request, string $id): JsonResponse
    {
        if (! $this->allowed($request, 'modify', 'vehicles')) {
            return $this->forbidden();
        }

        $company = $this->company($request);
        $vehicle = DB::table('transport_vehicles')
            ->where('company_id', $company)
            ->where('id', $id)
            ->first();
        if (! $vehicle) {
            return response()->json(['error' => 'Véhicule introuvable.'], 404);
        }
        if (DB::table('transport_trips')
            ->where('company_id', $company)
            ->where('vehicle_id', $id)
            ->whereIn('status', ['ASSIGNED', 'IN_PROGRESS'])
            ->exists()) {
            return response()->json(['error' => 'Un véhicule engagé dans une course en cours ne peut pas être supprimé.'], 422);
        }

        DB::table('transport_vehicles')->where('id', $id)->where('company_id', $company)->delete();

        return response()->json(['id' => $id]);
    }

    public function createTrip(Request $request): JsonResponse
    {
        if (! $this->allowed($request, 'create', 'trips')) {
            return $this->forbidden();
        }

        $input = $this->validated($request, [
            'pickup' => ['required', 'string', 'min:2', 'max:180'],
            'destination' => ['required', 'string', 'min:2', 'max:180'],
            'passengerName' => ['required', 'string', 'min:2', 'max:120'],
            'passengerPhone' => ['required', 'string', 'max:40'],
            'fare' => ['required', 'integer', 'min:1'],
            'driverId' => ['nullable', 'string'],
            'vehicleId' => ['nullable', 'string'],
        ]);
        $company = $this->company($request);
        $driverId = $input['driverId'] ?? null;
        $vehicleId = $input['vehicleId'] ?? null;
        if ($driverId !== null && ! DB::table('transport_drivers')->where('id', $driverId)->where('company_id', $company)->where('status', 'ACTIVE')->exists()) {
            return response()->json(['error' => 'Chauffeur actif introuvable.'], 422);
        }
        if ($vehicleId !== null && $driverId === null) {
            return response()->json(['error' => 'Un véhicule ne peut pas être affecté sans chauffeur.'], 422);
        }
        $vehicle = $vehicleId === null ? null : DB::table('transport_vehicles')
            ->where('id', $vehicleId)
            ->where('company_id', $company)
            ->where('status', 'AVAILABLE')
            ->first();
        if ($vehicleId !== null && ! $vehicle) {
            return response()->json(['error' => 'Véhicule disponible introuvable.'], 422);
        }
        if ($vehicle && $vehicle->driver_id !== $driverId) {
            return response()->json(['error' => 'Le véhicule sélectionné n’est pas rattaché à ce chauffeur.'], 422);
        }
        $status = $driverId !== null && $vehicleId !== null ? 'ASSIGNED' : 'REQUESTED';
        $row = [
            'id' => $this->id('trip'),
            'company_id' => $company,
            'reference' => 'TAXI-'.now()->format('YmdHis').'-'.Str::upper(Str::random(4)),
            'pickup' => trim($input['pickup']),
            'destination' => trim($input['destination']),
            'passenger_name' => trim($input['passengerName']),
            'passenger_phone' => trim($input['passengerPhone']),
            'fare' => (int) $input['fare'],
            'driver_id' => $driverId,
            'vehicle_id' => $vehicleId,
            'status' => $status,
            'requested_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ];
        DB::transaction(function () use ($row, $vehicleId): void {
            DB::table('transport_trips')->insert($row);
            if ($vehicleId !== null) {
                DB::table('transport_vehicles')->where('id', $vehicleId)->update(['status' => 'ON_TRIP', 'updated_at' => now()]);
            }
        });

        return response()->json($this->trip((object) $row), 201);
    }

    public function createPublicTrip(Request $request, string $slug): JsonResponse
    {
        $store = DB::table('ecommerce_stores')
            ->where('slug', $slug)
            ->where('status', 'PUBLISHED')
            ->first();
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
        }

        return $this->createPublicTripForStore($request, $store);
    }

    public function quotePublicTrip(Request $request, string $slug): JsonResponse
    {
        $store = DB::table('ecommerce_stores')
            ->where('slug', $slug)
            ->where('status', 'PUBLISHED')
            ->first();
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
        }

        return $this->quotePublicTripForStore($request, $store);
    }

    public function createPublicDomainTrip(Request $request): JsonResponse
    {
        $domain = DB::table('ecommerce_domains')
            ->where('domain', $request->getHost())
            ->where('status', 'ACTIVE')
            ->first();
        if (! $domain) {
            return response()->json(['error' => 'Aucune boutique publiée ne correspond à ce domaine.'], 404);
        }
        $store = DB::table('ecommerce_stores')
            ->where('company_id', $domain->company_id)
            ->where('status', 'PUBLISHED')
            ->first();
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
        }

        return $this->createPublicTripForStore($request, $store, true);
    }

    public function quotePublicDomainTrip(Request $request): JsonResponse
    {
        $domain = DB::table('ecommerce_domains')
            ->where('domain', $request->getHost())
            ->where('status', 'ACTIVE')
            ->first();
        if (! $domain) {
            return response()->json(['error' => 'Aucune boutique publiée ne correspond à ce domaine.'], 404);
        }
        $store = DB::table('ecommerce_stores')
            ->where('company_id', $domain->company_id)
            ->where('status', 'PUBLISHED')
            ->first();
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
        }

        return $this->quotePublicTripForStore($request, $store);
    }

    public function getPublicTrip(Request $request, string $slug, string $id): JsonResponse
    {
        $store = DB::table('ecommerce_stores')
            ->where('slug', $slug)
            ->where('status', 'PUBLISHED')
            ->first();
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
        }

        return $this->publicTripForStore($store, $id);
    }

    public function publicDomainTrip(Request $request, string $id): JsonResponse
    {
        $domain = DB::table('ecommerce_domains')
            ->where('domain', $request->getHost())
            ->where('status', 'ACTIVE')
            ->first();
        if (! $domain) {
            return response()->json(['error' => 'Aucune boutique publiée ne correspond à ce domaine.'], 404);
        }
        $store = DB::table('ecommerce_stores')
            ->where('company_id', $domain->company_id)
            ->where('status', 'PUBLISHED')
            ->first();
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
        }

        return $this->publicTripForStore($store, $id, true);
    }

    public function customerTripHistory(Request $request, string $slug): JsonResponse
    {
        $store = DB::table('ecommerce_stores')
            ->where('slug', $slug)
            ->where('status', 'PUBLISHED')
            ->first();
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
        }

        return $this->customerTripHistoryForStore($request, $store);
    }

    public function customerDomainTripHistory(Request $request): JsonResponse
    {
        $store = $this->publicDomainStore($request);
        if (! $store) {
            return response()->json(['error' => 'Aucune boutique publiée ne correspond à ce domaine.'], 404);
        }

        return $this->customerTripHistoryForStore($request, $store, true);
    }

    public function cancelCustomerTrip(Request $request, string $slug, string $id): JsonResponse
    {
        $store = DB::table('ecommerce_stores')
            ->where('slug', $slug)
            ->where('status', 'PUBLISHED')
            ->first();
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
        }

        return $this->cancelCustomerTripForStore($request, $store, $id, false);
    }

    public function cancelCustomerDomainTrip(Request $request, string $id): JsonResponse
    {
        $store = $this->publicDomainStore($request);
        if (! $store) {
            return response()->json(['error' => 'Aucune boutique publiée ne correspond à ce domaine.'], 404);
        }

        return $this->cancelCustomerTripForStore($request, $store, $id, true);
    }

    public function updateTripStatus(Request $request, string $id): JsonResponse
    {
        if (! $this->allowed($request, 'modify', 'trips')) {
            return $this->forbidden();
        }

        $input = $this->validated($request, ['status' => ['required', Rule::in(self::TRIP_STATUSES)]]);
        $company = $this->company($request);
        $trip = DB::table('transport_trips')->where('id', $id)->where('company_id', $company)->first();
        if (! $trip) {
            return response()->json(['error' => 'Course introuvable.'], 404);
        }
        $actor = $request->attributes->get('authActor');
        if (($actor['role'] ?? null) === 'employee') {
            $driverId = DB::table('transport_drivers')
                ->where('company_id', $company)
                ->where('employee_id', $actor['employeeId'] ?? null)
                ->value('id');
            if (! $driverId || $trip->driver_id !== $driverId) {
                return response()->json(['error' => 'Vous ne pouvez modifier que vos propres courses.'], 403);
            }
        }
        $failure = null;
        DB::transaction(function () use ($trip, $input, &$failure): void {
            if ($input['status'] === 'ASSIGNED' && $trip->status === 'OFFERED') {
                $vehicle = DB::table('transport_vehicles')
                    ->where('id', $trip->vehicle_id)
                    ->where('company_id', $trip->company_id)
                    ->lockForUpdate()
                    ->first();
                if (! $vehicle || $vehicle->status !== 'AVAILABLE') {
                    $failure = 'Le véhicule proposé n’est plus disponible.';
                    return;
                }
                DB::table('transport_vehicles')->where('id', $vehicle->id)->update([
                    'status' => 'ON_TRIP',
                    'updated_at' => now(),
                ]);
            }
            DB::table('transport_trips')->where('id', $trip->id)->update(['status' => $input['status'], 'updated_at' => now()]);
            if ($trip->vehicle_id !== null && in_array($input['status'], ['COMPLETED', 'CANCELLED'], true)) {
                DB::table('transport_vehicles')->where('id', $trip->vehicle_id)->where('status', 'ON_TRIP')->update(['status' => 'AVAILABLE', 'updated_at' => now()]);
            }
        });
        if ($failure !== null) {
            return response()->json(['error' => $failure], 422);
        }

        return response()->json($this->trip(DB::table('transport_trips')->where('id', $id)->first()));
    }

    public function publicVehicleImage(Request $request, string $slug, string $id)
    {
        $store = DB::table('ecommerce_stores')
            ->where('slug', $slug)
            ->where('status', 'PUBLISHED')
            ->first();
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            abort(404);
        }

        return $this->serveVehicleImage((string) $store->company_id, $id);
    }

    public function vehicleImage(Request $request, string $id)
    {
        $company = $this->company($request);
        return $this->serveVehicleImage($company, $id);
    }

    public function transportHeroImage(Request $request)
    {
        return $this->serveTransportHeroImage($this->company($request));
    }

    public function publicTransportSettings(Request $request, string $slug): JsonResponse
    {
        $store = DB::table('ecommerce_stores')
            ->where('slug', $slug)
            ->where('status', 'PUBLISHED')
            ->first();
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
        }
        if (! ModuleCatalog::allowsFeature((string) $store->company_id, 'transport', 'overview')) {
            return response()->json(['error' => 'Le service Transport n’est pas activé pour cette boutique.'], 403);
        }

        return response()->json([
            'heroImageUrl' => $this->transportHeroImageUrl((string) $store->company_id, $slug),
        ]);
    }

    public function publicDomainTransportSettings(Request $request): JsonResponse
    {
        $store = $this->publicDomainStore($request);
        if (! $store) {
            return response()->json(['error' => 'Aucune boutique publiée ne correspond à ce domaine.'], 404);
        }
        if (! ModuleCatalog::allowsFeature((string) $store->company_id, 'transport', 'overview')) {
            return response()->json(['error' => 'Le service Transport n’est pas activé pour cette boutique.'], 403);
        }

        return response()->json([
            'heroImageUrl' => $this->transportHeroImageUrl((string) $store->company_id, null, true),
        ]);
    }

    public function publicTransportHeroImage(Request $request, string $slug)
    {
        $store = DB::table('ecommerce_stores')
            ->where('slug', $slug)
            ->where('status', 'PUBLISHED')
            ->first();
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            abort(404);
        }

        return $this->serveTransportHeroImage((string) $store->company_id);
    }

    public function publicDomainTransportHeroImage(Request $request)
    {
        $store = $this->publicDomainStore($request);
        if (! $store) {
            abort(404);
        }

        return $this->serveTransportHeroImage((string) $store->company_id);
    }

    public function publicDomainVehicleImage(Request $request, string $id)
    {
        $domain = DB::table('ecommerce_domains')
            ->where('domain', $request->getHost())
            ->where('status', 'ACTIVE')
            ->first();
        if (! $domain) {
            abort(404);
        }

        $store = DB::table('ecommerce_stores')
            ->where('company_id', $domain->company_id)
            ->where('status', 'PUBLISHED')
            ->first();
        if (! $store || ! CompanyRegistry::isActive((string) $store->company_id)) {
            abort(404);
        }

        return $this->serveVehicleImage((string) $store->company_id, $id);
    }

    private function driver(object $row): array
    {
        $latitude = $row->latitude ?? null;
        $longitude = $row->longitude ?? null;
        return [
            'id' => $row->id,
            'companyId' => $row->company_id,
            'name' => $row->name,
            'phone' => $row->phone,
            'licenseNumber' => $row->license_number,
            'status' => $row->status,
            'employeeId' => $row->employee_id ?? null,
            'latitude' => $latitude === null ? null : (float) $latitude,
            'longitude' => $longitude === null ? null : (float) $longitude,
            'locationUpdatedAt' => $row->location_updated_at ?? null,
        ];
    }

    private function vehicle(object $row): array
    {
        return [
            'id' => $row->id,
            'companyId' => $row->company_id,
            'registration' => $row->registration,
            'model' => $row->model,
            'vehicleType' => $row->vehicle_type,
            'driverId' => $row->driver_id ?? null,
            'status' => $row->status,
            'imageUrl' => empty($row->image_data) ? '/taxi-car.svg' : '/api/transport/vehicles/'.rawurlencode($row->id).'/image',
        ];
    }

    private function trip(object $row, ?object $driver = null): array
    {
        $matchedDistance = $row->matched_distance_km ?? null;
        $routeDistance = $row->route_distance_km ?? null;
        $routeDuration = $row->route_duration_minutes ?? null;
        $pickupRouteDistance = $row->pickup_route_distance_km ?? null;
        $pickupEta = $row->pickup_eta_minutes ?? null;
        $driver ??= $row->driver_id
            ? DB::table('transport_drivers')
                ->where('company_id', $row->company_id)
                ->where('id', $row->driver_id)
                ->first()
            : null;
        return [
            'id' => $row->id,
            'companyId' => $row->company_id,
            'reference' => $row->reference,
            'pickup' => $row->pickup,
            'destination' => $row->destination,
            'passengerName' => $row->passenger_name,
            'passengerPhone' => $row->passenger_phone,
            'fare' => (int) $row->fare,
            'driverId' => $row->driver_id,
            'vehicleId' => $row->vehicle_id,
            'status' => $row->status,
            'requestedAt' => $row->requested_at,
            'pickupLatitude' => $row->pickup_latitude ?? null,
            'pickupLongitude' => $row->pickup_longitude ?? null,
            'matchedDistanceKm' => $matchedDistance === null ? null : (float) $matchedDistance,
            'destinationLatitude' => $row->destination_latitude ?? null,
            'destinationLongitude' => $row->destination_longitude ?? null,
            'routeDistanceKm' => $routeDistance === null ? null : (float) $routeDistance,
            'routeDurationMinutes' => $routeDuration === null ? null : (int) $routeDuration,
            'routeGeometry' => $this->decodeGeometry($row->route_geometry ?? null),
            'pickupRouteDistanceKm' => $pickupRouteDistance === null ? null : (float) $pickupRouteDistance,
            'pickupEtaMinutes' => $pickupEta === null ? null : (int) $pickupEta,
            'pickupRouteGeometry' => $this->decodeGeometry($row->pickup_route_geometry ?? null),
            'driverName' => $driver?->name,
            'driverPhone' => $driver?->phone,
            'vehicleModel' => null,
            'vehicleRegistration' => null,
            'vehicleType' => null,
            'vehicleImageUrl' => null,
        ];
    }

    private function publicTripForStore(object $store, string $id, bool $domain = false): JsonResponse
    {
        if (! ModuleCatalog::allowsFeature((string) $store->company_id, 'transport', 'overview')) {
            return response()->json(['error' => 'Le service Transport n’est pas activé pour cette boutique.'], 403);
        }
        $trip = DB::table('transport_trips')
            ->where('company_id', $store->company_id)
            ->where('id', $id)
            ->first();
        if (! $trip) {
            return response()->json(['error' => 'Course introuvable.'], 404);
        }

        $driver = $trip->driver_id
            ? DB::table('transport_drivers')->where('company_id', $store->company_id)->where('id', $trip->driver_id)->first()
            : null;
        $vehicle = $trip->vehicle_id
            ? DB::table('transport_vehicles')->where('company_id', $store->company_id)->where('id', $trip->vehicle_id)->first()
            : null;

        return response()->json([
            'trip' => $this->publicTrip($trip, $driver, $vehicle, $this->vehicleImageUrl((string) $store->company_id, $trip->vehicle_id, $domain)),
            'matched' => in_array($trip->status, ['OFFERED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'], true),
            'message' => $trip->status === 'OFFERED'
                ? 'Le chauffeur le plus proche doit encore valider la demande.'
                : ($trip->status === 'ASSIGNED' || $trip->status === 'IN_PROGRESS'
                    ? 'Votre chauffeur est en route.'
                    : 'Le suivi de votre course est disponible.'),
        ]);
    }

    private function customerTripHistoryForStore(Request $request, object $store, bool $domain = false): JsonResponse
    {
        if (! ModuleCatalog::allowsFeature((string) $store->company_id, 'transport', 'overview')) {
            return response()->json(['error' => 'Le service Transport n’est pas activé pour cette boutique.'], 403);
        }

        $customer = EcommerceCustomerAuth::customerFromRequest($request, (string) $store->company_id);
        if (! $customer) {
            return response()->json(['error' => 'Connectez-vous pour consulter votre historique Taxi.'], 401);
        }

        $rows = DB::table('transport_trips')
            ->where('company_id', $store->company_id)
            ->where('customer_id', $customer->id)
            ->orderByDesc('requested_at')
            ->limit(50)
            ->get();

        $trips = $rows->map(function (object $row) use ($store, $domain): array {
            $driver = $row->driver_id
                ? DB::table('transport_drivers')
                    ->where('company_id', $store->company_id)
                    ->where('id', $row->driver_id)
                    ->first()
                : null;
            $vehicle = $row->vehicle_id
                ? DB::table('transport_vehicles')
                    ->where('company_id', $store->company_id)
                    ->where('id', $row->vehicle_id)
                    ->first()
                : null;

            return $this->publicTrip(
                $row,
                $driver,
                $vehicle,
                $this->vehicleImageUrl((string) $store->company_id, $row->vehicle_id, $domain),
            );
        })->values();

        return response()->json(['trips' => $trips]);
    }

    private function cancelCustomerTripForStore(Request $request, object $store, string $id, bool $domain = false): JsonResponse
    {
        if (! ModuleCatalog::allowsFeature((string) $store->company_id, 'transport', 'overview')) {
            return response()->json(['error' => 'Le service Transport n’est pas activé pour cette boutique.'], 403);
        }

        $customer = EcommerceCustomerAuth::customerFromRequest($request, (string) $store->company_id);
        if (! $customer) {
            return response()->json(['error' => 'Connectez-vous pour annuler votre course.'], 401);
        }

        $failure = null;
        $failureStatus = 422;
        DB::transaction(function () use ($store, $id, $customer, &$failure, &$failureStatus): void {
            $trip = DB::table('transport_trips')
                ->where('company_id', $store->company_id)
                ->where('id', $id)
                ->lockForUpdate()
                ->first();
            if (! $trip) {
                $failure = 'Course introuvable.';
                $failureStatus = 404;
                return;
            }
            if (($trip->customer_id ?? null) !== $customer->id) {
                $failure = 'Cette course n’appartient pas à votre compte.';
                $failureStatus = 403;
                return;
            }
            if (! in_array($trip->status, self::CUSTOMER_CANCELLABLE_TRIP_STATUSES, true)) {
                $failure = 'Cette course ne peut plus être annulée à ce stade.';
                return;
            }

            DB::table('transport_trips')
                ->where('id', $trip->id)
                ->update(['status' => 'CANCELLED', 'updated_at' => now()]);
            if ($trip->vehicle_id !== null) {
                DB::table('transport_vehicles')
                    ->where('company_id', $store->company_id)
                    ->where('id', $trip->vehicle_id)
                    ->where('status', 'ON_TRIP')
                    ->update(['status' => 'AVAILABLE', 'updated_at' => now()]);
            }
        });

        if ($failure !== null) {
            return response()->json(['error' => $failure], $failureStatus);
        }

        $trip = DB::table('transport_trips')
            ->where('company_id', $store->company_id)
            ->where('id', $id)
            ->first();
        $driver = $trip?->driver_id
            ? DB::table('transport_drivers')->where('company_id', $store->company_id)->where('id', $trip->driver_id)->first()
            : null;
        $vehicle = $trip?->vehicle_id
            ? DB::table('transport_vehicles')->where('company_id', $store->company_id)->where('id', $trip->vehicle_id)->first()
            : null;

        return response()->json([
            'trip' => $this->publicTrip(
                $trip,
                $driver,
                $vehicle,
                $this->vehicleImageUrl((string) $store->company_id, $trip->vehicle_id, $domain),
            ),
            'matched' => false,
            'message' => 'Votre course a été annulée.',
        ]);
    }

    private function publicTrip(object $row, ?object $driver, ?object $vehicle, ?string $vehicleImageUrl = null): array
    {
        $trip = $this->trip($row, $driver);
        return [
            ...$trip,
            'driverLatitude' => $driver?->latitude === null ? null : (float) $driver->latitude,
            'driverLongitude' => $driver?->longitude === null ? null : (float) $driver->longitude,
            'vehicleModel' => $vehicle?->model,
            'vehicleRegistration' => $vehicle?->registration,
            'vehicleType' => $vehicle?->vehicle_type,
            'vehicleImageUrl' => $vehicleImageUrl ?? '/taxi-car.svg',
        ];
    }

    private function quotePublicTripForStore(Request $request, object $store): JsonResponse
    {
        $company = (string) $store->company_id;
        if (! ModuleCatalog::allowsFeature($company, 'transport', 'overview')) {
            return response()->json(['error' => 'Le service Transport n’est pas activé pour cette boutique.'], 403);
        }

        $input = $this->validated($request, [
            'destination' => ['required', 'string', 'min:2', 'max:180'],
            'pickupLatitude' => ['required', 'numeric', 'between:-90,90'],
            'pickupLongitude' => ['required', 'numeric', 'between:-180,180'],
        ]);
        if (! $this->isWithinDakar((float) $input['pickupLatitude'], (float) $input['pickupLongitude'])) {
            return response()->json(['error' => 'Le service Taxi est limité à la zone de Dakar.'], 422);
        }
        try {
            $route = $this->calculateRouteToAddress(
                (float) $input['pickupLatitude'],
                (float) $input['pickupLongitude'],
                trim($input['destination']),
            );
        } catch (\Throwable $exception) {
            report($exception);
            return response()->json(['error' => $this->routeErrorMessage($exception)], 422);
        }
        $payload = [
            'companyId' => $company,
            'destination' => trim($input['destination']),
            'pickupLatitude' => (float) $input['pickupLatitude'],
            'pickupLongitude' => (float) $input['pickupLongitude'],
            'expiresAt' => now()->addMinutes(5)->timestamp,
            'route' => $route,
        ];

        return response()->json([
            'quoteToken' => Crypt::encryptString(json_encode($payload, JSON_THROW_ON_ERROR)),
            'destination' => $route['destination'],
            'destinationLatitude' => $route['destinationLatitude'],
            'destinationLongitude' => $route['destinationLongitude'],
            'distanceKm' => $route['distanceKm'],
            'durationMinutes' => $route['durationMinutes'],
            'fare' => $this->taxiFare($route['distanceKm'], $company),
            'geometry' => $route['geometry'],
        ]);
    }

    private function createPublicTripForStore(Request $request, object $store, bool $domain = false): JsonResponse
    {
        $company = (string) $store->company_id;
        if (! ModuleCatalog::allowsFeature($company, 'transport', 'overview')) {
            return response()->json(['error' => 'Le service Transport n’est pas activé pour cette boutique.'], 403);
        }

        $input = $this->validated($request, [
            'pickup' => ['required', 'string', 'min:2', 'max:180'],
            'destination' => ['required', 'string', 'min:2', 'max:180'],
            'passengerName' => ['required', 'string', 'min:2', 'max:120'],
            'passengerPhone' => ['required', 'string', 'max:40'],
            'pickupLatitude' => ['required', 'numeric', 'between:-90,90'],
            'pickupLongitude' => ['required', 'numeric', 'between:-180,180'],
            'quoteToken' => ['nullable', 'string', 'max:20000'],
        ]);
        $latitude = (float) $input['pickupLatitude'];
        $longitude = (float) $input['pickupLongitude'];
        $destination = trim($input['destination']);
        $customer = EcommerceCustomerAuth::customerFromRequest($request, $company);
        if (! $this->isWithinDakar($latitude, $longitude)) {
            return response()->json(['error' => 'Le service Taxi est limité à la zone de Dakar.'], 422);
        }
        $route = $this->routeFromQuote($input['quoteToken'] ?? null, $company, $destination, $latitude, $longitude);
        if (($input['quoteToken'] ?? null) !== null && $route === null) {
            return response()->json(['error' => 'Le devis Taxi est invalide ou expiré.'], 422);
        }
        if ($route === null && trim((string) config('services.openrouteservice.api_key')) !== '') {
            try {
                $route = $this->calculateRouteToAddress($latitude, $longitude, $destination);
            } catch (\Throwable $exception) {
                report($exception);
                return response()->json(['error' => $this->routeErrorMessage($exception)], 422);
            }
        }
        $row = null;

        DB::transaction(function () use (&$row, $company, $customer, $input, $latitude, $longitude, $destination, $route): void {
            $drivers = DB::table('transport_drivers')
                ->where('company_id', $company)
                ->where('status', 'ACTIVE')
                ->whereNotNull('employee_id')
                ->whereNotNull('latitude')
                ->whereNotNull('longitude')
                ->where('location_updated_at', '>=', now()->subMinutes($this->transportSettings($company)['gpsValidityMinutes']))
                ->whereNotExists(function ($query) use ($company): void {
                    $query->select(DB::raw(1))
                        ->from('transport_trips as active_trip')
                        ->whereColumn('active_trip.driver_id', 'transport_drivers.id')
                        ->where('active_trip.company_id', $company)
                        ->whereIn('active_trip.status', ['OFFERED', 'ASSIGNED', 'IN_PROGRESS']);
                })
                ->lockForUpdate()
                ->get();
            $vehicles = DB::table('transport_vehicles')
                ->where('company_id', $company)
                ->where('status', 'AVAILABLE')
                ->whereNotNull('driver_id')
                ->orderBy('updated_at')
                ->lockForUpdate()
                ->get()
                ->keyBy('driver_id');

            $match = $drivers
                ->map(fn (object $driver): array => [
                    'driver' => $driver,
                    'distance' => $this->distanceInKm($latitude, $longitude, (float) $driver->latitude, (float) $driver->longitude),
                    'vehicle' => $vehicles->get($driver->id),
                ])
                ->sortBy('distance')
                ->first(fn (array $candidate): bool => $candidate['vehicle'] !== null);
            $driver = $match['driver'] ?? null;
            $vehicle = $match['vehicle'] ?? null;
            $status = $driver && $vehicle ? 'OFFERED' : 'REQUESTED';
            $row = [
                'id' => $this->id('trip'),
                'company_id' => $company,
                'customer_id' => $customer?->id,
                'reference' => 'TAXI-'.now()->format('YmdHis').'-'.Str::upper(Str::random(4)),
                'pickup' => trim($input['pickup']),
                'destination' => $destination,
                'passenger_name' => trim($input['passengerName']),
                'passenger_phone' => trim($input['passengerPhone']),
                'fare' => $route ? $this->taxiFare($route['distanceKm'], $company) : 0,
                'driver_id' => $driver?->id,
                'vehicle_id' => $vehicle?->id,
                'status' => $status,
                'requested_at' => now(),
                'pickup_latitude' => $latitude,
                'pickup_longitude' => $longitude,
                'matched_distance_km' => $match['distance'] ?? null,
                'destination_latitude' => $route['destinationLatitude'] ?? null,
                'destination_longitude' => $route['destinationLongitude'] ?? null,
                'route_distance_km' => $route['distanceKm'] ?? null,
                'route_duration_minutes' => $route['durationMinutes'] ?? null,
                'route_geometry' => $route ? json_encode($route['geometry'], JSON_THROW_ON_ERROR) : null,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            DB::table('transport_trips')->insert($row);
            if ($vehicle && $status === 'ASSIGNED') {
                DB::table('transport_vehicles')->where('id', $vehicle->id)->update([
                    'status' => 'ON_TRIP',
                    'updated_at' => now(),
                ]);
            }
        });

        $tripRow = DB::table('transport_trips')->where('id', $row['id'])->first();
        $driver = $tripRow->driver_id
            ? DB::table('transport_drivers')->where('company_id', $company)->where('id', $tripRow->driver_id)->first()
            : null;
        if ($driver && $tripRow->pickup_latitude !== null && $tripRow->pickup_longitude !== null) {
            try {
                $pickupRoute = $this->calculateRouteCoordinates(
                    [(float) $driver->longitude, (float) $driver->latitude],
                    [(float) $tripRow->pickup_longitude, (float) $tripRow->pickup_latitude],
                );
                DB::table('transport_trips')->where('id', $tripRow->id)->update([
                    'pickup_route_distance_km' => $pickupRoute['distanceKm'],
                    'pickup_eta_minutes' => $pickupRoute['durationMinutes'],
                    'pickup_route_geometry' => json_encode($pickupRoute['geometry'], JSON_THROW_ON_ERROR),
                    'pickup_route_updated_at' => now(),
                    'updated_at' => now(),
                ]);
                $tripRow = DB::table('transport_trips')->where('id', $tripRow->id)->first();
            } catch (\Throwable) {
                // The trip remains valid even when live routing is temporarily unavailable.
            }
        }

        $response = $this->publicTrip(
            $tripRow,
            $driver,
            $tripRow->vehicle_id ? DB::table('transport_vehicles')->where('company_id', $company)->where('id', $tripRow->vehicle_id)->first() : null,
            $tripRow->vehicle_id ? $this->vehicleImageUrl($company, $tripRow->vehicle_id, $domain) : null,
        );
        return response()->json([
            'trip' => $response,
            'matched' => in_array($response['status'], ['OFFERED', 'ASSIGNED'], true),
            'message' => $response['status'] === 'ASSIGNED'
                ? 'Le chauffeur le plus proche a été trouvé. Vous pouvez le contacter directement.'
                : ($response['status'] === 'OFFERED'
                    ? 'Le chauffeur le plus proche a reçu votre demande. Il doit la valider pour démarrer la course.'
                    : 'Votre demande est enregistrée. Aucun chauffeur disponible avec une position GPS récente.'),
        ], 201);
    }

    /**
     * @return array{
     *   destination: string,
     *   destinationLatitude: float,
     *   destinationLongitude: float,
     *   distanceKm: float,
     *   durationMinutes: int,
     *   geometry: array<string, mixed>
     * }
     */
    private function calculateRouteToAddress(float $originLatitude, float $originLongitude, string $destination): array
    {
        if (! $this->isWithinDakar($originLatitude, $originLongitude)) {
            throw new \InvalidArgumentException('ORIGIN_OUTSIDE_DAKAR');
        }
        $key = trim((string) config('services.openrouteservice.api_key'));
        $destinationCoordinates = $key !== ''
            ? $this->geocode(
                rtrim((string) config('services.openrouteservice.base_url', 'https://api.openrouteservice.org'), '/'),
                ['Authorization' => $key, 'Accept' => 'application/json'],
                $destination,
            )
            : $this->geocodeWithOpenStreetMap($destination);
        if (! $this->isWithinDakar($destinationCoordinates[1], $destinationCoordinates[0])) {
            throw new \InvalidArgumentException('DESTINATION_OUTSIDE_DAKAR');
        }
        $route = $this->calculateRouteCoordinates(
            [$originLongitude, $originLatitude],
            $destinationCoordinates,
        );

        return [
            ...$route,
            'destination' => $destination,
            'destinationLatitude' => $destinationCoordinates[1],
            'destinationLongitude' => $destinationCoordinates[0],
        ];
    }

    /**
     * @param  array{0: float, 1: float}  $origin
     * @param  array{0: float, 1: float}  $destination
     * @return array{distanceKm: float, durationMinutes: int, geometry: array<string, mixed>}
     */
    private function calculateRouteCoordinates(array $origin, array $destination): array
    {
        $key = trim((string) config('services.openrouteservice.api_key'));
        if ($key !== '') {
            $baseUrl = rtrim((string) config('services.openrouteservice.base_url', 'https://api.openrouteservice.org'), '/');
            $response = Http::timeout(10)
                ->withHeaders([
                    'Authorization' => $key,
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json',
                ])
                ->post($baseUrl.'/v2/directions/driving-car/geojson', [
                    'coordinates' => [$origin, $destination],
                    'instructions' => false,
                    'units' => 'km',
                ]);
            $feature = $response->json('features.0');
            $distance = data_get($feature, 'properties.summary.distance');
            $duration = data_get($feature, 'properties.summary.duration');
            $geometry = data_get($feature, 'geometry');
        } else {
            $response = Http::timeout(10)
                ->withHeaders(['Accept' => 'application/json', 'User-Agent' => 'MAXIMUS Taxi'])
                ->get('https://router.project-osrm.org/route/v1/driving/'.implode(',', $origin).';'.implode(',', $destination), [
                    'overview' => 'full',
                    'geometries' => 'geojson',
                    'steps' => 'false',
                ]);
            $distance = $response->json('routes.0.distance');
            $duration = $response->json('routes.0.duration');
            $geometry = $response->json('routes.0.geometry');
            if (is_numeric($distance)) {
                $distance = (float) $distance / 1000;
            }
        }
        if (! $response->successful() || ! is_numeric($distance) || ! is_numeric($duration) || ! is_array($geometry)
            || ($geometry['type'] ?? null) !== 'LineString' || ! is_array($geometry['coordinates'] ?? null)) {
            throw new \RuntimeException('Le service cartographique n’a pas pu calculer l’itinéraire Taxi.');
        }

        return [
            'distanceKm' => round($key !== '' ? (float) $distance : (float) $distance, 2),
            'durationMinutes' => max(1, (int) ceil(((float) $duration) / 60)),
            'geometry' => $geometry,
        ];
    }

    /**
     * @return array{0: float, 1: float}
     */
    private function geocodeWithOpenStreetMap(string $address): array
    {
        $response = Http::timeout(10)
            ->withHeaders(['Accept' => 'application/json', 'User-Agent' => 'MAXIMUS Taxi'])
            ->get('https://nominatim.openstreetmap.org/search', [
                'format' => 'jsonv2',
                'limit' => 1,
            'q' => $address.', Dakar, Sénégal',
            'countrycodes' => 'sn',
            'viewbox' => '-17.65,14.95,-16.95,14.55',
            'bounded' => 1,
            ]);
        $result = $response->json('0');
        if (! $response->successful() || ! is_array($result) || ! is_numeric($result['lon'] ?? null) || ! is_numeric($result['lat'] ?? null)) {
            throw new \RuntimeException('OpenStreetMap n’a pas pu localiser la destination.');
        }

        $coordinates = [(float) $result['lon'], (float) $result['lat']];
        if (! $this->isWithinDakar($coordinates[1], $coordinates[0])) {
            throw new \InvalidArgumentException('DESTINATION_OUTSIDE_DAKAR');
        }

        return $coordinates;
    }

    /**
     * @param  array<string, string>  $headers
     * @return array{0: float, 1: float}
     */
    private function geocode(string $baseUrl, array $headers, string $address): array
    {
        $response = Http::timeout(10)
            ->withHeaders($headers)
            ->get($baseUrl.'/geocode/search', [
                'text' => $address.', Dakar, Sénégal',
                'size' => 1,
                'boundary.country' => 'SN',
                'boundary.rect.min_lon' => self::DAKAR_BOUNDS['minLongitude'],
                'boundary.rect.min_lat' => self::DAKAR_BOUNDS['minLatitude'],
                'boundary.rect.max_lon' => self::DAKAR_BOUNDS['maxLongitude'],
                'boundary.rect.max_lat' => self::DAKAR_BOUNDS['maxLatitude'],
            ]);
        $coordinates = $response->json('features.0.geometry.coordinates');
        if (! $response->successful() || ! is_array($coordinates) || ! is_numeric($coordinates[0] ?? null) || ! is_numeric($coordinates[1] ?? null)) {
            throw new \RuntimeException('Le fournisseur de géocodage n’a pas pu localiser la destination.');
        }

        return [(float) $coordinates[0], (float) $coordinates[1]];
    }

    private function taxiFare(float $distanceKm, string $company): int
    {
        $settings = $this->transportSettings($company);
        return max(1000, $settings['baseFare'] + ((int) ceil($distanceKm) * $settings['pricePerKm']));
    }

    private function routeFromQuote(?string $token, string $company, string $destination, float $latitude, float $longitude): ?array
    {
        if (! $token) {
            return null;
        }

        try {
            $payload = json_decode(Crypt::decryptString($token), true, 512, JSON_THROW_ON_ERROR);
            $validCoordinates = isset($payload['pickupLatitude'], $payload['pickupLongitude'])
                && abs((float) $payload['pickupLatitude'] - $latitude) < 0.00001
                && abs((float) $payload['pickupLongitude'] - $longitude) < 0.00001;
            if (($payload['companyId'] ?? null) !== $company
                || ($payload['destination'] ?? null) !== $destination
                || ($payload['expiresAt'] ?? 0) < now()->timestamp
                || ! $validCoordinates
                || ! is_array($payload['route'] ?? null)) {
                return null;
            }
            if (! $this->isWithinDakar(
                (float) ($payload['route']['destinationLatitude'] ?? 0),
                (float) ($payload['route']['destinationLongitude'] ?? 0),
            )) {
                return null;
            }

            return $payload['route'];
        } catch (\Throwable) {
            return null;
        }
    }

    private function decodeGeometry(?string $geometry): ?array
    {
        if (! $geometry) {
            return null;
        }

        try {
            $decoded = json_decode($geometry, true, 512, JSON_THROW_ON_ERROR);
            return is_array($decoded) ? $decoded : null;
        } catch (\Throwable) {
            return null;
        }
    }

    private function distanceInKm(float $latitudeA, float $longitudeA, float $latitudeB, float $longitudeB): float
    {
        $earthRadius = 6371.0;
        $latDelta = deg2rad($latitudeB - $latitudeA);
        $lonDelta = deg2rad($longitudeB - $longitudeA);
        $a = sin($latDelta / 2) ** 2
            + cos(deg2rad($latitudeA)) * cos(deg2rad($latitudeB)) * sin($lonDelta / 2) ** 2;
        return $earthRadius * 2 * asin(min(1, sqrt($a)));
    }

    /**
     * @return array{contents: string, mime: string}|null
     */
    private function decodeImageData(string $imageData): ?array
    {
        if (! preg_match('/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+\/=\r\n]+)$/', trim($imageData), $matches)) {
            return null;
        }

        $contents = base64_decode($matches[2], true);
        if (! is_string($contents) || $contents === '' || strlen($contents) > 2 * 1024 * 1024) {
            return null;
        }

        return [
            'contents' => $contents,
            'mime' => $matches[1] === 'image/jpg' ? 'image/jpeg' : $matches[1],
        ];
    }

    private function vehicleImageUrl(string $companyId, ?string $vehicleId, bool $domain = false): ?string
    {
        if (! $vehicleId) {
            return null;
        }

        $vehicle = DB::table('transport_vehicles')
            ->where('company_id', $companyId)
            ->where('id', $vehicleId)
            ->first();
        if (! $vehicle || empty($vehicle->image_data)) {
            return '/taxi-car.svg';
        }

        return $domain
            ? '/api/shop-domain/transport/vehicles/'.rawurlencode($vehicleId).'/image'
            : '/api/shop/'.rawurlencode((string) DB::table('ecommerce_stores')->where('company_id', $companyId)->where('status', 'PUBLISHED')->value('slug')).'/transport/vehicles/'.rawurlencode($vehicleId).'/image';
    }

    private function serveVehicleImage(string $companyId, string $vehicleId)
    {
        $vehicle = DB::table('transport_vehicles')
            ->where('company_id', $companyId)
            ->where('id', $vehicleId)
            ->first();
        if (! $vehicle || empty($vehicle->image_data)) {
            abort(404);
        }

        $contents = base64_decode($vehicle->image_data, true);
        if (! is_string($contents)) {
            abort(404);
        }

        return response($contents, 200, [
            'Content-Type' => $vehicle->image_mime ?: 'application/octet-stream',
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }

    private function transportHeroImageUrl(string $companyId, ?string $slug = null, bool $domain = false): string
    {
        $settings = $this->rawTransportSettings($companyId);
        if (empty($settings['heroImageData'])) {
            return '/taxi-transport-hero.jpg';
        }

        return $domain
            ? '/api/shop-domain/transport/hero-image'
            : '/api/shop/'.rawurlencode((string) $slug).'/transport/hero-image';
    }

    private function serveTransportHeroImage(string $companyId)
    {
        $settings = $this->rawTransportSettings($companyId);
        if (empty($settings['heroImageData'])) {
            abort(404);
        }
        $contents = base64_decode((string) $settings['heroImageData'], true);
        if (! is_string($contents)) {
            abort(404);
        }

        return response($contents, 200, [
            'Content-Type' => $settings['heroImageMime'] ?? 'application/octet-stream',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }

    private function rawTransportSettings(string $company): array
    {
        $configuration = DB::table('maximus_company_modules')
            ->where('company_id', $company)
            ->where('module_id', 'transport')
            ->value('configuration');
        $configuration = json_decode($configuration ?? '{}', true);
        return is_array($configuration) && is_array($configuration['transport'] ?? null)
            ? $configuration['transport']
            : [];
    }

    private function publicDomainStore(Request $request): ?object
    {
        $domain = DB::table('ecommerce_domains')
            ->where('domain', $request->getHost())
            ->where('status', 'ACTIVE')
            ->first();
        if (! $domain) {
            return null;
        }

        $store = DB::table('ecommerce_stores')
            ->where('company_id', $domain->company_id)
            ->where('status', 'PUBLISHED')
            ->first();
        return $store && CompanyRegistry::isActive((string) $store->company_id) ? $store : null;
    }

    private function validated(Request $request, array $rules): array
    {
        return Validator::make($request->all(), $rules)->validate();
    }

    private function company(Request $request): string
    {
        return (string) $request->attributes->get('companyId');
    }

    private function transportSettings(string $company): array
    {
        $settings = $this->rawTransportSettings($company);

        return [
            'gpsValidityMinutes' => max(1, min(60, (int) ($settings['gpsValidityMinutes'] ?? self::DEFAULT_SETTINGS['gpsValidityMinutes']))),
            'trackingIntervalSeconds' => 10,
            'baseFare' => max(0, min(1000000, (int) ($settings['baseFare'] ?? self::DEFAULT_SETTINGS['baseFare']))),
            'pricePerKm' => max(1, min(1000000, (int) ($settings['pricePerKm'] ?? self::DEFAULT_SETTINGS['pricePerKm']))),
            'heroImageUrl' => empty($settings['heroImageData'])
                ? '/taxi-transport-hero.jpg'
                : '/api/transport/settings/hero-image',
        ];
    }

    private function isWithinDakar(float $latitude, float $longitude): bool
    {
        return $latitude >= self::DAKAR_BOUNDS['minLatitude']
            && $latitude <= self::DAKAR_BOUNDS['maxLatitude']
            && $longitude >= self::DAKAR_BOUNDS['minLongitude']
            && $longitude <= self::DAKAR_BOUNDS['maxLongitude'];
    }

    private function routeErrorMessage(\Throwable $exception): string
    {
        return str_contains($exception->getMessage(), 'OUTSIDE_DAKAR')
            ? 'Les destinations et départs Taxi sont limités à la zone de Dakar.'
            : 'La destination n’a pas pu être localisée ou l’itinéraire est indisponible.';
    }

    private function id(string $prefix): string
    {
        return $prefix.'-'.Str::uuid();
    }

    private function allowed(Request $request, string $action, ?string $feature = null): bool
    {
        $actor = $request->attributes->get('authActor');

        return is_array($actor) && ModuleAuthorization::allows($actor, 'transport', $action, $feature);
    }

    private function forbidden(): JsonResponse
    {
        return response()->json(['error' => 'Action non autorisée pour le module Transport.'], 403);
    }
}