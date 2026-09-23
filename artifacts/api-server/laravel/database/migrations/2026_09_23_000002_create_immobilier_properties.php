<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('immobilier_properties')) {
            Schema::create('immobilier_properties', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->index();
                $table->string('reference', 60);
                $table->string('property_type', 40);
                $table->string('transaction_type', 20);
                $table->string('status', 20)->default('AVAILABLE')->index();
                $table->string('city', 100);
                $table->string('neighborhood', 120)->nullable();
                $table->string('address', 240)->nullable();
                $table->unsignedBigInteger('price')->default(0);
                $table->unsignedInteger('area_m2')->nullable();
                $table->unsignedTinyInteger('bedrooms')->nullable();
                $table->unsignedTinyInteger('bathrooms')->nullable();
                $table->boolean('furnished')->default(false);
                $table->text('internal_notes')->nullable();
                $table->timestamps();
                $table->unique(['company_id', 'reference']);
                $table->index(['company_id', 'status']);
            });
        }

        if (Schema::hasTable('immobilier_listings') && ! Schema::hasColumn('immobilier_listings', 'property_id')) {
            Schema::table('immobilier_listings', function (Blueprint $table): void {
                $table->string('property_id')->nullable()->index();
            });
        }

        if (! Schema::hasTable('immobilier_listings') || ! Schema::hasTable('immobilier_properties')) {
            return;
        }

        DB::table('immobilier_listings')
            ->whereNull('property_id')
            ->orderBy('id')
            ->get()
            ->each(function (object $listing): void {
                $propertyId = 'property-'.Str::lower(Str::random(18));
                $reference = 'LEG-'.strtoupper(substr(hash('sha256', $listing->id), 0, 8));

                DB::table('immobilier_properties')->insert([
                    'id' => $propertyId,
                    'company_id' => $listing->company_id,
                    'reference' => $reference,
                    'property_type' => $listing->property_type,
                    'transaction_type' => $listing->transaction_type,
                    'status' => match ($listing->status) {
                        'SOLD' => 'SOLD',
                        'RENTED' => 'RENTED',
                        'RESERVED' => 'RESERVED',
                        'ARCHIVED' => 'ARCHIVED',
                        default => 'AVAILABLE',
                    },
                    'city' => $listing->city,
                    'neighborhood' => $listing->neighborhood,
                    'address' => $listing->address,
                    'price' => $listing->price,
                    'area_m2' => $listing->area_m2,
                    'bedrooms' => $listing->bedrooms,
                    'bathrooms' => $listing->bathrooms,
                    'furnished' => $listing->furnished,
                    'internal_notes' => null,
                    'created_at' => $listing->created_at,
                    'updated_at' => $listing->updated_at,
                ]);

                DB::table('immobilier_listings')
                    ->where('id', $listing->id)
                    ->update(['property_id' => $propertyId]);
            });
    }

    public function down(): void
    {
        if (Schema::hasTable('immobilier_listings') && Schema::hasColumn('immobilier_listings', 'property_id')) {
            Schema::table('immobilier_listings', function (Blueprint $table): void {
                $table->dropColumn('property_id');
            });
        }

        Schema::dropIfExists('immobilier_properties');
    }
};