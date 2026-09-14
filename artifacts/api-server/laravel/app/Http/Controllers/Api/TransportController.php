<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthUser;
use App\Support\CompanyRegistry;
use App\Support\ModuleCatalog;
use App\Support\ModuleAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TransportController extends Controller
{
    private const DRIVER_STATUSES = ['ACTIVE', 'INACTIVE'];
    private const VEHICLE_STATUSES = ['AVAILABLE', 'ON_TRIP', 'MAINTENANCE'];
    private const TRIP_STATUSES = ['REQUESTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    private const DEFAULT_SETTINGS = [
        'gpsValidityMinutes' => 5,
        'trackingIntervalSeconds' => 30,
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
            'trackingIntervalSeconds' => ['required', 'integer', 'min:10', 'max:300'],
        ]);
        $company = $this->company($request);
        $module = DB::table('maximus_company_modules')
            ->where('company_id', $company)
            ->where('module_id', 'transport')
            ->first();
        $configuration = json_decode($module->configuration ?? '{}', true);
        $configuration = is_array($configuration) ? $configuration : [];
        $configuration['transport'] = [
            'gpsValidityMinutes' => (int) $input['gpsValidityMinutes'],
            'trackingIntervalSeconds' => (int) $input['trackingIntervalSeconds'],
        ];
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
        ]);
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
            'created_at' => now(),
            'updated_at' => now(),
        ];
        DB::table('transport_vehicles')->insert($row);

        return response()->json($this->vehicle((object) $row), 201);
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

        return $this->createPublicTripForStore($request, $store);
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
        DB::transaction(function () use ($trip, $input): void {
            DB::table('transport_trips')->where('id', $trip->id)->update(['status' => $input['status'], 'updated_at' => now()]);
            if ($trip->vehicle_id !== null && in_array($input['status'], ['COMPLETED', 'CANCELLED'], true)) {
                DB::table('transport_vehicles')->where('id', $trip->vehicle_id)->where('status', 'ON_TRIP')->update(['status' => 'AVAILABLE', 'updated_at' => now()]);
            }
        });

        return response()->json($this->trip(DB::table('transport_trips')->where('id', $id)->first()));
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
        ];
    }

    private function trip(object $row, ?object $driver = null): array
    {
        $matchedDistance = $row->matched_distance_km ?? null;
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
            'driverName' => $driver?->name,
            'driverPhone' => $driver?->phone,
        ];
    }

    private function createPublicTripForStore(Request $request, object $store): JsonResponse
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
        ]);
        $latitude = (float) $input['pickupLatitude'];
        $longitude = (float) $input['pickupLongitude'];
        $row = null;

        DB::transaction(function () use (&$row, $company, $input, $latitude, $longitude): void {
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
                        ->whereIn('active_trip.status', ['ASSIGNED', 'IN_PROGRESS']);
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
            $status = $driver && $vehicle ? 'ASSIGNED' : 'REQUESTED';
            $row = [
                'id' => $this->id('trip'),
                'company_id' => $company,
                'reference' => 'TAXI-'.now()->format('YmdHis').'-'.Str::upper(Str::random(4)),
                'pickup' => trim($input['pickup']),
                'destination' => trim($input['destination']),
                'passenger_name' => trim($input['passengerName']),
                'passenger_phone' => trim($input['passengerPhone']),
                'fare' => 0,
                'driver_id' => $driver?->id,
                'vehicle_id' => $vehicle?->id,
                'status' => $status,
                'requested_at' => now(),
                'pickup_latitude' => $latitude,
                'pickup_longitude' => $longitude,
                'matched_distance_km' => $match['distance'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            DB::table('transport_trips')->insert($row);
            if ($vehicle) {
                DB::table('transport_vehicles')->where('id', $vehicle->id)->update([
                    'status' => 'ON_TRIP',
                    'updated_at' => now(),
                ]);
            }
        });

        $response = $this->trip((object) $row);
        return response()->json([
            'trip' => $response,
            'matched' => $response['status'] === 'ASSIGNED',
            'message' => $response['status'] === 'ASSIGNED'
                ? 'Le chauffeur le plus proche a été trouvé. Vous pouvez le contacter directement.'
                : 'Votre demande est enregistrée. Aucun chauffeur disponible avec une position GPS récente.',
        ], 201);
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
        $configuration = DB::table('maximus_company_modules')
            ->where('company_id', $company)
            ->where('module_id', 'transport')
            ->value('configuration');
        $configuration = json_decode($configuration ?? '{}', true);
        $settings = is_array($configuration) && is_array($configuration['transport'] ?? null)
            ? $configuration['transport']
            : [];

        return [
            'gpsValidityMinutes' => max(1, min(60, (int) ($settings['gpsValidityMinutes'] ?? self::DEFAULT_SETTINGS['gpsValidityMinutes']))),
            'trackingIntervalSeconds' => max(10, min(300, (int) ($settings['trackingIntervalSeconds'] ?? self::DEFAULT_SETTINGS['trackingIntervalSeconds']))),
        ];
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