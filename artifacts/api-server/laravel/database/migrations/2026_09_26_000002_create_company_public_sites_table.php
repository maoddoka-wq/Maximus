<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('company_public_sites')) {
            Schema::create('company_public_sites', function (Blueprint $table): void {
                $table->string('company_id')->primary();
                $table->boolean('maximus_enabled')->default(false);
                $table->boolean('company_enabled')->default(false);
                $table->json('module_ids')->default('[]');
                $table->timestampsTz();
                $table->index(['maximus_enabled', 'company_enabled']);
            });
        }

        if (! Schema::hasTable('ecommerce_stores') || ! Schema::hasTable('maximus_company_modules')) {
            return;
        }

        $publishedCompanies = DB::table('ecommerce_stores')
            ->where('status', 'PUBLISHED')
            ->whereNotNull('company_id')
            ->distinct()
            ->pluck('company_id');

        foreach ($publishedCompanies as $companyId) {
            $moduleIds = DB::table('maximus_company_modules')
                ->where('company_id', $companyId)
                ->whereIn('module_id', ['ecommerce', 'transport', 'immobilier'])
                ->whereIn('status', ['ACTIF', 'BETA'])
                ->pluck('module_id')
                ->values()
                ->all();

            DB::table('company_public_sites')->updateOrInsert(
                ['company_id' => $companyId],
                [
                    'maximus_enabled' => true,
                    'company_enabled' => true,
                    'module_ids' => json_encode($moduleIds, JSON_UNESCAPED_UNICODE),
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('company_public_sites');
    }
};