<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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

    public function bootstrap(Request $request): JsonResponse
    {
        if (! $this->allowed($request, 'view')) {
            return $this->forbidden();
        }

        $company = $this->company($request);
        $drivers = DB::table('transport_drivers')->where('company_id', $company)->orderBy('name')->get();
        $vehicles = DB::table('transport_vehicles')->where('company_id', $company)->orderBy('registration')->get();
        $trips = DB::table('transport_trips')->where('company_id', $company)->orderByDesc('requested_at')->limit(250)->get();
        $today = now()->startOfDay()->toDateTimeString();

        return response()->json([
            'drivers' => $drivers->map(fn ($row) => $this->driver($row))->values(),
            'vehicles' => $vehicles->map(fn ($row) => $this->vehicle($row))->values(),
            'trips' => $trips->map(fn ($row) => $this->trip($row))->values(),
            'metrics' => [
                'activeDrivers' => $drivers->where('status', 'ACTIVE')->count(),
                'availableVehicles' => $vehicles->where('status', 'AVAILABLE')->count(),
                'todayTrips' => $trips->filter(fn ($row) => $row->requested_at && $row->requested_at >= $today)->count(),
                'todayRevenue' => $trips
                    ->filter(fn ($row) => $row->status === 'COMPLETED' && $row->requested_at && $row->requested_at >= $today)
                    ->sum('fare'),
            ],
        ]);
    }

    public function createDriver(Request $request): JsonResponse
    {
        if (! $this->allowed($request, 'create', 'drivers')) {
            return $this->forbidden();
        }

        $input = $this->validated($request, [
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'phone' => ['required', 'string', 'max:40'],
            'licenseNumber' => ['required', 'string', 'max:80'],
            'status' => ['sometimes', Rule::in(self::DRIVER_STATUSES)],
        ]);
        $row = [
            'id' => $this->id('driver'),
            'company_id' => $this->company($request),
            'name' => trim($input['name']),
            'phone' => trim($input['phone']),
            'license_number' => trim($input['licenseNumber']),
            'status' => $input['status'] ?? 'ACTIVE',
            'created_at' => now(),
            'updated_at' => now(),
        ];
        DB::table('transport_drivers')->insert($row);

        return response()->json($this->driver((object) $row), 201);
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
            'status' => ['sometimes', Rule::in(self::VEHICLE_STATUSES)],
        ]);
        $company = $this->company($request);
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
        if ($vehicleId !== null && ! DB::table('transport_vehicles')->where('id', $vehicleId)->where('company_id', $company)->where('status', 'AVAILABLE')->exists()) {
            return response()->json(['error' => 'Véhicule disponible introuvable.'], 422);
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
        return [
            'id' => $row->id,
            'companyId' => $row->company_id,
            'name' => $row->name,
            'phone' => $row->phone,
            'licenseNumber' => $row->license_number,
            'status' => $row->status,
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
            'status' => $row->status,
        ];
    }

    private function trip(object $row): array
    {
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
        ];
    }

    private function validated(Request $request, array $rules): array
    {
        return Validator::make($request->all(), $rules)->validate();
    }

    private function company(Request $request): string
    {
        return (string) $request->attributes->get('companyId');
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