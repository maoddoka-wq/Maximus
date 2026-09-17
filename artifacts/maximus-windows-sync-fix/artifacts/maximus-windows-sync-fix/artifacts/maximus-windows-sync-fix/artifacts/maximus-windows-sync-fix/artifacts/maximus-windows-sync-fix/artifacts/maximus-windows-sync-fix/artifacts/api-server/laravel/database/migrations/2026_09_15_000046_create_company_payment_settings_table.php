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
        if (! Schema::hasTable('company_payment_settings')) {
            Schema::create('company_payment_settings', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->string('company_id')->unique();
                $table->string('status')->default('INACTIF');
                $table->json('providers')->default('[]');
                $table->string('updated_by')->nullable();
                $table->timestampsTz();
                $table->index(['company_id', 'status']);
            });
        }

        // Preserve payment behavior for companies that already existed before
        // MAXIMUS introduced this explicit control plane.
        if (Schema::hasTable('companies')) {
            foreach (DB::table('companies')->pluck('id') as $companyId) {
                DB::table('company_payment_settings')->updateOrInsert(
                    ['company_id' => (string) $companyId],
                    [
                        'id' => 'company-payment-'.Str::slug((string) $companyId),
                        'status' => 'ACTIF',
                        'providers' => json_encode(['DIAMANOPAY'], JSON_UNESCAPED_UNICODE),
                        'updated_at' => now(),
                        'created_at' => now(),
                    ],
                );
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('company_payment_settings');
    }
};