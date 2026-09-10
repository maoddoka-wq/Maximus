<?php

namespace Tests\Feature;

use App\Models\AuthUser;
use App\Support\MaximusAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CarRentalTest extends TestCase
{
    use RefreshDatabase;

    public function test_location_owner_permissions_are_checked_for_read_and_write(): void
    {
        $request = $this->asActor('employee', ['ecommerce:menu:location' => ['voir']]);

        $request->getJson('/api/ecommerce/location/settings?companyId=kora')->assertOk();
        $request->putJson('/api/ecommerce/location/settings?companyId=kora', [
            'whatsapp' => '+221770000000',
        ])->assertForbidden();
    }

    public function test_quote_uses_google_distance_and_automobile_rates(): void
    {
        $this->createStore('kora', 'cars-quote');
        $car = $this->createCar(['daily_rate' => 10000, 'km_rate' => 100, 'fees' => 500]);
        Http::fake(['https://maps.googleapis.com/maps/api/distancematrix/json*' => Http::response([
            'status' => 'OK',
            'rows' => [['elements' => [['status' => 'OK', 'distance' => ['value' => 12501], 'duration' => ['value' => 3600]]]]],
        ])]);
        config(['services.google_maps.api_key' => 'test-google-key']);

        $this->getJson('/api/shop/cars-quote/location/'.$car.'/quote?'.http_build_query($this->periodPayload()))
            ->assertOk()
            ->assertJsonPath('days', 2)
            ->assertJsonPath('distanceKm', 13)
            ->assertJsonPath('total', 21800);
    }

    public function test_overlap_returns_conflict_and_expired_hold_is_released(): void
    {
        $this->createStore('kora', 'cars-overlap');
        $car = $this->createCar();
        $first = $this->reserve($car, 'cars-overlap')->assertCreated();

        $this->reserve($car, 'cars-overlap')->assertStatus(409);
        DB::table('ecommerce_car_reservations')->where('id', $first->json('id'))->update([
            'status' => 'PENDING_PAYMENT',
            'hold_expires_at' => now()->subMinute(),
        ]);
        $this->reserve($car, 'cars-overlap')->assertCreated();
    }

    public function test_reservation_creates_order_line_and_only_returns_raw_invoice_token(): void
    {
        $this->createStore('kora', 'cars-token');
        $car = $this->createCar();
        $response = $this->reserve($car, 'cars-token')->assertCreated();

        $this->assertNotEmpty($response->json('invoiceToken'));
        $this->assertDatabaseHas('ecommerce_order_items', [
            'order_id' => $response->json('orderId'),
            'rental_id' => $car,
        ]);
        $row = DB::table('ecommerce_car_reservations')->where('id', $response->json('id'))->first();
        $this->assertNotSame($response->json('invoiceToken'), $row->public_token_hash);
        $this->assertSame(hash('sha256', $response->json('invoiceToken')), $row->public_token_hash);
    }

    public function test_guest_invoice_requires_token_and_is_available_after_paid_webhook(): void
    {
        $this->createStore('kora', 'cars-invoice');
        $car = $this->createCar();
        $reservation = $this->reserve($car, 'cars-invoice')->assertCreated();
        $token = $reservation->json('invoiceToken');
        DB::table('ecommerce_orders')->where('id', $reservation->json('orderId'))->update([
            'payment_charge_id' => 'invoice-charge', 'payment_status' => 'PENDING',
        ]);
        config(['services.diamanopay.webhook_secret' => 'test-secret']);
        $this->postSignedWebhook(['data' => ['id' => 'invoice-charge', 'status' => 'SUCCEEDED']])
            ->assertOk();

        $this->getJson('/api/shop/cars-invoice/location/reservations/'.$reservation->json('id').'/invoice?token=wrong')
            ->assertNotFound();
        $this->get('/api/shop/cars-invoice/location/reservations/'.$reservation->json('id').'/invoice?token='.$token)
            ->assertOk()->assertSee('Total payé')->assertSee('Client Location');
    }

    public function test_payment_creation_rejects_an_expired_location_hold(): void
    {
        $this->createStore('kora', 'cars-payment-hold');
        $car = $this->createCar();
        $reservation = $this->reserve($car, 'cars-payment-hold')->assertCreated();
        DB::table('ecommerce_car_reservations')->where('id', $reservation->json('id'))->update([
            'hold_expires_at' => now()->subMinute(),
        ]);

        $this->postJson('/api/shop/cars-payment-hold/orders/'.$reservation->json('orderId').'/payment')
            ->assertStatus(422);
    }

    public function test_expired_payment_is_rejected_and_late_webhook_does_not_confirm(): void
    {
        $this->createStore('kora', 'cars-late');
        $car = $this->createCar();
        $reservation = $this->reserve($car, 'cars-late')->assertCreated();
        DB::table('ecommerce_car_reservations')->where('id', $reservation->json('id'))->update([
            'hold_expires_at' => now()->subMinute(),
        ]);
        DB::table('ecommerce_orders')->where('id', $reservation->json('orderId'))->update([
            'payment_charge_id' => 'late-charge',
            'payment_status' => 'PENDING',
        ]);
        config(['services.diamanopay.webhook_secret' => 'test-secret']);
        $this->postSignedWebhook(['data' => ['id' => 'late-charge', 'status' => 'SUCCEEDED']])
            ->assertOk();
        $this->assertDatabaseHas('ecommerce_car_reservations', [
            'id' => $reservation->json('id'),
            'status' => 'PAYMENT_FAILED',
        ]);
        $this->assertDatabaseMissing('seller_wallet_ledger', ['reference_id' => $reservation->json('orderId')]);
    }

    public function test_public_settings_and_domain_location_are_exposed_only_when_published(): void
    {
        $this->createStore('kora', 'cars-domain');
        DB::table('ecommerce_location_settings')->insert([
            'company_id' => 'kora', 'whatsapp' => '+221770000000',
            'message' => 'Réservez par WhatsApp', 'policy' => 'Pièce requise',
            'default_daily_rate' => 1000, 'default_km_rate' => 10, 'default_deposit' => 0,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('ecommerce_domains')->insert([
            'id' => 'domain-cars-kora', 'company_id' => 'kora', 'domain' => 'cars.kora.test',
            'target_host' => 'maximus.test', 'verification_token' => 'token',
            'status' => 'ACTIVE', 'last_error' => '', 'verified_at' => now(),
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->getJson('/api/shop/cars-domain')->assertOk()
            ->assertJsonPath('store.locationSettings.whatsapp', '+221770000000');
        $this->getJson('http://cars.kora.test/api/shop-domain')
            ->assertOk()->assertJsonPath('store.locationSettings.message', 'Réservez par WhatsApp');
    }

    private function reserve(string $car, string $slug)
    {
        config(['services.google_maps.api_key' => 'test-google-key']);
        Http::fake(['https://maps.googleapis.com/maps/api/distancematrix/json*' => Http::response([
            'status' => 'OK', 'rows' => [['elements' => [['status' => 'OK',
                'distance' => ['value' => 1000], 'duration' => ['value' => 600]]]]],
        ])]);

        return $this->postJson('/api/shop/'.$slug.'/location/reservations', [
            ...$this->periodPayload(),
            'rentalId' => $car,
            'tripType' => 'FAMILY',
            'customerName' => 'Client Location',
            'customerEmail' => 'location@example.test',
            'customerPhone' => '+221770000000',
        ]);
    }

    private function periodPayload(): array
    {
        return [
            'startsAt' => now()->addDays(2)->toDateString(),
            'endsAt' => now()->addDays(4)->toDateString(),
            'departure' => 'Dakar',
            'destination' => 'Thiès',
        ];
    }

    private function createCar(array $overrides = []): string
    {
        $id = 'car-'.uniqid();
        DB::table('ecommerce_rentals')->insert(array_merge([
            'id' => $id, 'company_id' => 'kora', 'name' => 'Toyota Test',
            'description' => '', 'category' => 'Véhicules', 'price' => 10000,
            'billing_unit' => 'JOUR', 'availability' => 1, 'status' => 'PUBLISHED',
            'daily_rate' => 10000, 'km_rate' => 0, 'deposit' => 0, 'fees' => 0,
            'equipment' => json_encode([]), 'gallery' => json_encode([]),
            'unavailable_periods' => json_encode([]), 'created_at' => now(), 'updated_at' => now(),
        ], $overrides));

        return $id;
    }

    private function createStore(string $company, string $slug): void
    {
        DB::table('ecommerce_stores')->insert([
            'id' => 'store-'.$slug, 'company_id' => $company, 'slug' => $slug,
            'name' => 'Boutique voitures', 'description' => '', 'status' => 'PUBLISHED',
            'currency' => 'XOF', 'primary_color' => '#D69E2E', 'accent_color' => '#172033',
            'logo_url' => '', 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function asActor(string $role = 'company_admin', array $permissions = [])
    {
        $user = AuthUser::query()->create([
            'id' => 'car-rental-'.uniqid(), 'email' => 'car-'.uniqid().'@kora.demo',
            'password_hash' => 'not-used', 'display_name' => 'Location',
            'role' => $role, 'company_id' => 'kora', 'employee_id' => null,
            'sector_ids' => [], 'permissions' => $permissions, 'status' => 'ACTIF',
        ]);

        return $this->withCredentials()->withUnencryptedCookie(
            MaximusAuth::COOKIE,
            MaximusAuth::issueSession($user),
        );
    }

    private function postSignedWebhook(array $payload)
    {
        $body = json_encode($payload, JSON_THROW_ON_ERROR);
        return $this->call('POST', '/api/payments/diamanopay/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_DIAMANOPAY_SIGNATURE' => hash_hmac('sha256', $body, 'test-secret'),
        ], $body);
    }
}