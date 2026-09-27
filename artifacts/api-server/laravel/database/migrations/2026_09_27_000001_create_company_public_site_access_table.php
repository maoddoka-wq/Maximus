<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('company_public_site_access')) {
            Schema::create('company_public_site_access', function (Blueprint $table): void {
                $table->string('company_id')->primary();
                $table->boolean('enabled')->default(false);
                $table->string('updated_by')->nullable();
                $table->timestampsTz();
            });
        }

        DB::table('ecommerce_stores')
            ->where('status', 'PUBLISHED')
            ->select('company_id')
            ->distinct()
            ->orderBy('company_id')
            ->get()
            ->each(function (object $store): void {
                DB::table('company_public_site_access')->insertOrIgnore([
                    'company_id' => $store->company_id,
                    'enabled' => true,
                    'updated_by' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_public_site_access');
    }
};