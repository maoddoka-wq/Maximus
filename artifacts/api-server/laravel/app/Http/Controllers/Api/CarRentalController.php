<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\EcommerceCustomerAuth;
use App\Support\ModuleAuthorization;
use App\Support\CompanyRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Throwable;

final class CarRentalController extends Controller
{
    public const TRIP_TYPES = ['FAMILY', 'BUSINESS'];
    public const STATUSES = [
        'PENDING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED',
        'CANCELLED', 'PAYMENT_FAILED', 'UNAVAILABLE',
    ];

    private const ACTIVE_STATUSES = ['PENDING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS'];

    public function settings(Request $request): JsonResponse
    {
        if (! $this->ownerAllowed($request, 'view', 'location')) {
            return $this->forbidden();
        }
        $company = $this->company($request);
        $settings = DB::table('ecommerce_location_settings')->where('company_id', $company)->first();

        return response()->json($this->settingsPayload($settings, $company));
    }

    public function saveSettings(Request $request): JsonResponse
    {
        if (! $this->ownerAllowed($request, 'modify', 'location')) {
            return $this->forbidden();
        }
        $input = Validator::make($request->all(), [
            'whatsapp' => ['nullable', 'string', 'max:40'],
            'message' => ['nullable', 'string', 'max:2000'],
            'defaultDailyRate' => ['nullable', 'integer', 'min:0'],
            'defaultKmRate' => ['nullable', 'integer', 'min:0'],
            'defaultDeposit' => ['nullable', 'integer', 'min:0'],
            'policy' => ['nullable', 'string', 'max:5000'],
        ])->validate();
        $company = $this->company($request);
        $values = [
            'company_id' => $company,
            'whatsapp' => trim((string) ($input['whatsapp'] ?? '')),
            'message' => trim((string) ($input['message'] ?? '')),
            'default_daily_rate' => (int) ($input['defaultDailyRate'] ?? 0),
            'default_km_rate' => (int) ($input['defaultKmRate'] ?? 0),
            'default_deposit' => (int) ($input['defaultDeposit'] ?? 0),
            'policy' => trim((string) ($input['policy'] ?? '')),
            'updated_at' => now(),
        ];
        DB::table('ecommerce_location_settings')->updateOrInsert(
            ['company_id' => $company],
            $values + ['created_at' => now()],
        );

        return response()->json($this->settingsPayload(
            DB::table('ecommerce_location_settings')->where('company_id', $company)->first(),
            $company,
        ));
    }

    public function reservations(Request $request): JsonResponse
    {
        if (! $this->ownerAllowed($request, 'view', 'location')) {
            return $this->forbidden();
        }
        return response()->json(DB::table('ecommerce_car_reservations')
            ->where('company_id', $this->company($request))
            ->orderBy('starts_at')->get()
            ->map(fn (object $row): array => $this->reservationPayload($row))->values());
    }

    public function transition(Request $request, string $id): JsonResponse
    {
        if (! $this->ownerAllowed($request, 'modify', 'location')) {
            return $this->forbidden();
        }
        $input = Validator::make($request->all(), [
            'status' => ['required', 'in:'.implode(',', self::STATUSES)],
        ])->validate();
        $allowed = [
            'CONFIRMED' => ['CONFIRMED', 'IN_PROGRESS', 'CANCELLED'],
            'IN_PROGRESS' => ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
            'COMPLETED' => ['COMPLETED'],
            'CANCELLED' => ['CANCELLED'],
            'PENDING_PAYMENT' => ['PENDING_PAYMENT', 'CANCELLED'],
            'PAYMENT_FAILED' => ['PAYMENT_FAILED', 'CANCELLED'],
            'UNAVAILABLE' => ['UNAVAILABLE', 'CANCELLED'],
        ];
        $company = $this->company($request);
        $row = DB::table('ecommerce_car_reservations')->where('id', $id)
            ->where('company_id', $company)->first();
        if (! $row) {
            return response()->json(['error' => 'Réservation introuvable.'], 404);
        }
        if (! in_array($input['status'], $allowed[$row->status] ?? [], true)) {
            return response()->json(['error' => 'Cette transition de réservation n’est pas autorisée.'], 422);
        }
        DB::table('ecommerce_car_reservations')->where('id', $id)->update([
            'status' => $input['status'], 'updated_at' => now(),
        ]);

        return response()->json($this->reservationPayload(
            DB::table('ecommerce_car_reservations')->where('id', $id)->first(),
        ));
    }

    public function quote(Request $request, string $slug, string $id): JsonResponse
    {
        $store = $this->store($slug, $request);

        return $store ? $this->quoteForStore($request, $store, $id)
            : response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
    }

    public function quoteDomain(Request $request, string $id): JsonResponse
    {
        $store = $this->store(null, $request);

        return $store ? $this->quoteForStore($request, $store, $id)
            : response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
    }

    public function reserve(Request $request, string $slug): JsonResponse
    {
        $store = $this->store($slug, $request);

        return $store ? $this->reserveForStore($request, $store)
            : response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
    }

    public function reserveDomain(Request $request): JsonResponse
    {
        $store = $this->store(null, $request);

        return $store ? $this->reserveForStore($request, $store)
            : response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
    }

    public function invoice(Request $request, string $id)
    {
        if (! $this->ownerAllowed($request, 'view', 'location')) {
            return $this->forbidden();
        }
        $row = $this->ownedReservation($request, $id);
        if (! $row) {
            return response()->json(['error' => 'Réservation introuvable.'], 404);
        }
        if (! $row->invoice_html || $row->status === 'PENDING_PAYMENT') {
            return response()->json(['error' => 'La facture sera disponible après confirmation du paiement.'], 409);
        }

        return response($row->invoice_html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="facture-'.$id.'.html"',
        ]);
    }

    public function publicInvoice(Request $request, string $slug, string $id)
    {
        $store = $this->store($slug, $request);
        $row = $store ? DB::table('ecommerce_car_reservations')->where('id', $id)
            ->where('company_id', $store->company_id)->first() : null;
        $customer = $store ? EcommerceCustomerAuth::customerFromRequest($request, $store->company_id) : null;
        $token = trim((string) $request->query('token', ''));
        $tokenValid = $token !== '' && $row && hash_equals((string) $row->public_token_hash, hash('sha256', $token));
        if (! $row || ((! $customer || $row->customer_id !== $customer->id) && ! $tokenValid) || ! $row->invoice_html) {
            return response()->json(['error' => 'Facture introuvable.'], 404);
        }

        return response($row->invoice_html, 200, ['Content-Type' => 'text/html; charset=UTF-8']);
    }

    public function publicInvoiceDomain(Request $request, string $id)
    {
        $store = $this->store(null, $request);
        if (! $store) {
            return response()->json(['error' => 'Boutique introuvable ou non publiée.'], 404);
        }
        return $this->publicInvoiceForStore($request, $store, $id);
    }

    private function quoteForStore(Request $request, object $store, string $id): JsonResponse
    {
        $input = $this->reservationInput($request, false);
        $car = $this->publishedCar($store->company_id, $id);
        if (! $car || ! $this->carAvailableForPeriod($car, $input['startsAt'], $input['endsAt'])) {
            return response()->json(['error' => 'Véhicule indisponible.'], 404);
        }
        if ($this->overlaps($car->id, $input['startsAt'], $input['endsAt'])) {
            return response()->json(['error' => 'Cette période est déjà réservée.'], 409);
        }
        try {
            return response()->json($this->calculateQuote($car, $input));
        } catch (Throwable $error) {
            return response()->json(['error' => $error->getMessage()], 422);
        }
    }

    private function reserveForStore(Request $request, object $store): JsonResponse
    {
        $customer = EcommerceCustomerAuth::customerFromRequest($request, $store->company_id);
        $publicToken = Str::random(64);
        $created = false;
        $input = $this->reservationInput($request, ! $customer);
        $key = trim((string) ($request->header('Idempotency-Key') ?: ($input['idempotencyKey'] ?? '')));
        try {
            $reservation = DB::transaction(function () use ($input, $key, $store, $customer, $publicToken, &$created): object {
                if ($key !== '') {
                    $existing = DB::table('ecommerce_car_reservations')
                        ->where('company_id', $store->company_id)->where('idempotency_key', $key)->first();
                    if ($existing) {
                        return $existing;
                    }
                }
                $car = DB::table('ecommerce_rentals')->where('id', $input['rentalId'])
                    ->where('company_id', $store->company_id)->lockForUpdate()->first();
                if (! $car || $car->status !== 'PUBLISHED'
                    || ! $this->carAvailableForPeriod($car, $input['startsAt'], $input['endsAt'])) {
                    throw new \RuntimeException('Véhicule indisponible.');
                }
                $this->releaseExpiredHolds($car->id);
                if ($this->overlaps($car->id, $input['startsAt'], $input['endsAt'])) {
                    throw new \RuntimeException('Cette période est déjà réservée.');
                }
                $quote = $this->calculateQuote($car, $input);
                $orderId = 'order-'.Str::uuid();
                $reservationId = 'reservation-'.Str::uuid();
                $reference = 'LOC-'.strtoupper(Str::substr(str_replace('-', '', $orderId), -8));
                DB::table('ecommerce_orders')->insert([
                    'id' => $orderId, 'company_id' => $store->company_id, 'reference' => $reference,
                    'customer_name' => $customer?->name ?: $input['customerName'],
                    'customer_email' => $customer?->email ?: $input['customerEmail'],
                    'customer_phone' => $customer?->phone ?: ($input['customerPhone'] ?? ''),
                    'shipping_address' => $input['departure'], 'note' => 'Réservation véhicule '.$car->name,
                    'total' => $quote['total'], 'status' => 'NOUVELLE', 'created_at' => now(), 'updated_at' => now(),
                ]);
                DB::table('ecommerce_order_items')->insert([
                    'id' => 'order-line-'.Str::uuid(), 'order_id' => $orderId, 'rental_id' => $car->id,
                    'product_id' => null, 'product_name' => $car->name, 'unit_price' => $quote['total'],
                    'quantity' => 1, 'line_total' => $quote['total'], 'product_type' => 'RENTAL',
                    'rental_period' => 'JOUR', 'created_at' => now(), 'updated_at' => now(),
                ]);
                DB::table('ecommerce_car_reservations')->insert([
                    'id' => $reservationId, 'company_id' => $store->company_id, 'rental_id' => $car->id,
                    'order_id' => $orderId, 'customer_id' => $customer?->id, 'public_token_hash' => hash('sha256', $publicToken), 'starts_at' => $input['startsAt'],
                    'ends_at' => $input['endsAt'], 'trip_type' => $input['tripType'], 'departure' => $input['departure'],
                    'destination' => $input['destination'], 'distance_km' => $quote['distanceKm'],
                    'duration_minutes' => $quote['durationMinutes'], 'rate_snapshot' => json_encode($this->rateSnapshot($car)),
                    'total_detail' => json_encode($quote), 'status' => 'PENDING_PAYMENT',
                    'hold_expires_at' => now()->addMinutes(30), 'idempotency_key' => $key ?: null,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
                $created = true;

                return DB::table('ecommerce_car_reservations')->where('id', $reservationId)->first();
            });

            $payload = $this->reservationPayload($reservation);
            if ($created) {
                $payload['invoiceToken'] = $publicToken;
                $payload['invoiceUrl'] = '/api/shop/'.$store->slug.'/location/reservations/'.$reservation->id.'/invoice';
            }
            return response()->json($payload, $created ? 201 : 200);
        } catch (Throwable $error) {
            return response()->json(['error' => $error->getMessage()],
                str_contains($error->getMessage(), 'déjà réservée') ? 409 : 422);
        }
    }

    private function reservationInput(Request $request, bool $withCustomer): array
    {
        $rules = [
            'rentalId' => [$withCustomer ? 'required' : 'sometimes', 'string'],
            'startsAt' => ['required', 'date', 'after_or_equal:today'],
            'endsAt' => ['required', 'date', 'after:startsAt'],
            'tripType' => [$withCustomer ? 'required' : 'sometimes', 'in:'.implode(',', self::TRIP_TYPES)],
            'departure' => ['required', 'string', 'min:2', 'max:500'],
            'destination' => ['required', 'string', 'min:2', 'max:500'],
            'customerName' => [$withCustomer ? 'required' : 'sometimes', 'string', 'min:2', 'max:120'],
            'customerEmail' => [$withCustomer ? 'required' : 'sometimes', 'email', 'max:160'],
            'customerPhone' => ['nullable', 'string', 'max:40'],
            'idempotencyKey' => ['nullable', 'string', 'max:120'],
        ];

        $input = Validator::make($request->all(), $rules)->validate();
        $input['tripType'] ??= 'FAMILY';

        return $input;
    }

    private function calculateQuote(object $car, array $input): array
    {
        [$distance, $duration] = $this->distance($input['departure'], $input['destination']);
        $days = max(1, (int) ceil((strtotime($input['endsAt']) - strtotime($input['startsAt'])) / 86400));
        $daily = (int) ($car->daily_rate ?: $car->price);
        $base = $days * $daily;
        $kilometres = $distance * (int) $car->km_rate;

        return [
            'days' => $days, 'distanceKm' => $distance, 'durationMinutes' => $duration,
            'daily' => $base, 'distance' => $kilometres, 'fees' => (int) $car->fees,
            'deposit' => (int) $car->deposit, 'total' => $base + $kilometres + (int) $car->fees + (int) $car->deposit,
        ];
    }

    private function distance(string $origin, string $destination): array
    {
        $key = config('services.google_maps.api_key');
        if (! $key) {
            throw new \RuntimeException('GOOGLE_MAPS_API_KEY est requis pour calculer la distance.');
        }
        $response = Http::timeout(10)->get('https://maps.googleapis.com/maps/api/distancematrix/json', [
            'origins' => $origin, 'destinations' => $destination, 'key' => $key,
        ]);
        if (! $response->successful() || $response->json('status') !== 'OK'
            || $response->json('rows.0.elements.0.status') !== 'OK') {
            throw new \RuntimeException('Google Maps Distance Matrix n’a pas pu calculer la distance.');
        }

        return [
            (int) ceil($response->json('rows.0.elements.0.distance.value') / 1000),
            (int) round($response->json('rows.0.elements.0.duration.value') / 60),
        ];
    }

    private function overlaps(string $rentalId, string $startsAt, string $endsAt): bool
    {
        return DB::table('ecommerce_car_reservations')->where('rental_id', $rentalId)
            ->whereIn('status', self::ACTIVE_STATUSES)->where('starts_at', '<', $endsAt)
            ->where('ends_at', '>', $startsAt)->where(function ($query): void {
                $query->whereNull('hold_expires_at')->orWhere('hold_expires_at', '>', now());
            })->exists();
    }

    private function releaseExpiredHolds(string $rentalId): void
    {
        DB::table('ecommerce_car_reservations')->where('rental_id', $rentalId)
            ->where('status', 'PENDING_PAYMENT')->whereNotNull('hold_expires_at')
            ->where('hold_expires_at', '<=', now())->update(['status' => 'PAYMENT_FAILED', 'updated_at' => now()]);
    }

    private function publishedCar(string $company, string $id): ?object
    {
        return DB::table('ecommerce_rentals')->where('id', $id)->where('company_id', $company)
            ->where('status', 'PUBLISHED')->where('availability', '>', 0)->first();
    }

    private function carAvailableForPeriod(object $car, string $startsAt, string $endsAt): bool
    {
        if ((int) $car->availability < 1) {
            return false;
        }
        foreach (json_decode($car->unavailable_periods ?? '[]', true) ?: [] as $period) {
            if (! empty($period['startsAt']) && ! empty($period['endsAt'])
                && $period['startsAt'] < $endsAt && $period['endsAt'] > $startsAt) {
                return false;
            }
        }

        return true;
    }

    private function store(?string $slug, Request $request): ?object
    {
        if ($slug) {
            $store = DB::table('ecommerce_stores')->where('slug', $slug)->where('status', 'PUBLISHED')->first();
            return $store && $this->publicLocationEnabled((string) $store->company_id) ? $store : null;
        }
        $domain = DB::table('ecommerce_domains')->where('domain', strtolower($request->getHost()))
            ->where('status', 'ACTIVE')->first();

        $store = $domain ? DB::table('ecommerce_stores')->where('company_id', $domain->company_id)
            ->where('status', 'PUBLISHED')->first() : null;
        return $store && $this->publicLocationEnabled((string) $store->company_id) ? $store : null;
    }

    private function ownedReservation(Request $request, string $id): ?object
    {
        return DB::table('ecommerce_car_reservations')->where('id', $id)
            ->where('company_id', $this->company($request))->first();
    }

    private function publicInvoiceForStore(Request $request, object $store, string $id)
    {
        $row = DB::table('ecommerce_car_reservations')->where('id', $id)
            ->where('company_id', $store->company_id)->first();
        $customer = EcommerceCustomerAuth::customerFromRequest($request, $store->company_id);
        $token = trim((string) $request->query('token', ''));
        $tokenValid = $token !== '' && $row && hash_equals((string) $row->public_token_hash, hash('sha256', $token));
        if (! $row || ((! $customer || $row->customer_id !== $customer->id) && ! $tokenValid) || ! $row->invoice_html) {
            return response()->json(['error' => 'Facture introuvable.'], 404);
        }
        return response($row->invoice_html, 200, ['Content-Type' => 'text/html; charset=UTF-8']);
    }

    private function rateSnapshot(object $car): array
    {
        return ['dailyRate' => (int) ($car->daily_rate ?: $car->price), 'kmRate' => (int) $car->km_rate,
            'deposit' => (int) $car->deposit, 'fees' => (int) $car->fees];
    }

    private function settingsPayload(?object $row, string $company): array
    {
        return ['companyId' => $company, 'whatsapp' => $row->whatsapp ?? '', 'message' => $row->message ?? '',
            'defaultDailyRate' => (int) ($row->default_daily_rate ?? 0), 'defaultKmRate' => (int) ($row->default_km_rate ?? 0),
            'defaultDeposit' => (int) ($row->default_deposit ?? 0), 'policy' => $row->policy ?? ''];
    }

    private function reservationPayload(object $row): array
    {
        return ['id' => $row->id, 'companyId' => $row->company_id, 'rentalId' => $row->rental_id,
            'orderId' => $row->order_id, 'customerId' => $row->customer_id, 'startsAt' => $row->starts_at,
            'endsAt' => $row->ends_at, 'tripType' => $row->trip_type, 'departure' => $row->departure,
            'destination' => $row->destination, 'distanceKm' => $row->distance_km, 'durationMinutes' => $row->duration_minutes,
            'rateSnapshot' => json_decode($row->rate_snapshot, true), 'totalDetail' => json_decode($row->total_detail, true),
            'status' => $row->status, 'holdExpiresAt' => $row->hold_expires_at, 'invoiceAvailable' => (bool) $row->invoice_html];
    }

    private function company(Request $request): string
    {
        return (string) $request->attributes->get('companyId', $request->query('companyId', ''));
    }

    private function ownerAllowed(Request $request, string $action, string $feature): bool
    {
        $actor = $request->attributes->get('authActor');
        return is_array($actor) && ModuleAuthorization::allows($actor, 'ecommerce', $action, $feature);
    }

    private function publicLocationEnabled(string $company): bool
    {
        if (! CompanyRegistry::isActive($company)) {
            return false;
        }
        $access = DB::table('maximus_company_modules')->where('company_id', $company)
            ->where('module_id', 'ecommerce')->first();
        $features = $access ? json_decode($access->feature_ids ?? '[]', true) : [];
        $features = is_array($features) ? $features : [];
        return in_array($access->status ?? '', ['ACTIF', 'BETA'], true)
            && ($features === [] || in_array('location', $features, true));
    }

    private function forbidden(): JsonResponse
    {
        return response()->json(['error' => 'Cette action n’est pas autorisée pour votre rôle.'], 403);
    }
}