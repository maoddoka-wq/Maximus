<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable('ecommerce_rentals')) Schema::table('ecommerce_rentals', function(Blueprint $t) {
            foreach (['brand','model','transmission','fuel','conditions','instructions'] as $c) if (!Schema::hasColumn('ecommerce_rentals',$c)) $t->text($c)->nullable();
            if (!Schema::hasColumn('ecommerce_rentals','year')) $t->unsignedSmallInteger('year')->nullable();
            if (!Schema::hasColumn('ecommerce_rentals','seats')) $t->unsignedSmallInteger('seats')->nullable();
            if (!Schema::hasColumn('ecommerce_rentals','equipment')) $t->json('equipment')->nullable();
            if (!Schema::hasColumn('ecommerce_rentals','gallery')) $t->json('gallery')->nullable();
            if (!Schema::hasColumn('ecommerce_rentals','daily_rate')) $t->unsignedBigInteger('daily_rate')->default(0);
            if (!Schema::hasColumn('ecommerce_rentals','km_rate')) $t->unsignedBigInteger('km_rate')->default(0);
            if (!Schema::hasColumn('ecommerce_rentals','deposit')) $t->unsignedBigInteger('deposit')->default(0);
            if (!Schema::hasColumn('ecommerce_rentals','fees')) $t->unsignedBigInteger('fees')->default(0);
            if (!Schema::hasColumn('ecommerce_rentals','unavailable_periods')) $t->json('unavailable_periods')->nullable();
        });
        if (!Schema::hasTable('ecommerce_location_settings')) Schema::create('ecommerce_location_settings', function(Blueprint $t) {
            $t->string('company_id')->primary(); $t->string('whatsapp')->default(''); $t->text('message')->default('');
            $t->unsignedBigInteger('default_daily_rate')->default(0); $t->unsignedBigInteger('default_km_rate')->default(0);
            $t->unsignedBigInteger('default_deposit')->default(0); $t->text('policy')->default(''); $t->timestampsTz();
        });
        if (!Schema::hasTable('ecommerce_car_reservations')) Schema::create('ecommerce_car_reservations', function(Blueprint $t) {
            $t->string('id')->primary(); $t->string('company_id')->index(); $t->string('rental_id')->index(); $t->string('order_id')->nullable()->index(); $t->string('customer_id')->nullable()->index();
            $t->timestampTz('starts_at'); $t->timestampTz('ends_at'); $t->string('trip_type',20)->default('FAMILY'); $t->text('departure'); $t->text('destination');
            $t->unsignedBigInteger('distance_km')->nullable(); $t->unsignedInteger('duration_minutes')->nullable(); $t->json('rate_snapshot'); $t->json('total_detail');
            $t->string('status',20)->index(); $t->timestampTz('hold_expires_at')->nullable(); $t->string('idempotency_key')->nullable(); $t->text('invoice_html')->nullable(); $t->timestampsTz();
            $t->unique(['company_id','idempotency_key']); $t->index(['rental_id','starts_at','ends_at']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('ecommerce_car_reservations');
        Schema::dropIfExists('ecommerce_location_settings');
        if (Schema::hasTable('ecommerce_rentals')) {
            $columns = ['brand', 'model', 'year', 'seats', 'transmission', 'fuel', 'equipment', 'gallery',
                'daily_rate', 'km_rate', 'deposit', 'fees', 'conditions', 'instructions', 'unavailable_periods'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('ecommerce_rentals', $column)) {
                    Schema::table('ecommerce_rentals', fn (Blueprint $table) => $table->dropColumn($column));
                }
            }
        }
    }
};