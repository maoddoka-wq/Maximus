<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['suppliers', 'warehouses', 'locations'] as $kind) {
            $table = 'labo_stock_'.$kind;
            if (Schema::hasTable($table)) {
                continue;
            }
            Schema::create($table, function (Blueprint $blueprint) use ($kind): void {
                $blueprint->string('id')->primary();
                $blueprint->string('company_id');
                $blueprint->string('target_module_id');
                $blueprint->string('target_feature_id');
                if ($kind === 'locations') {
                    $blueprint->string('warehouse_id');
                }
                $blueprint->text('name');
                if ($kind === 'suppliers') {
                    $blueprint->text('contact_name')->default('');
                    $blueprint->text('email')->default('');
                    $blueprint->text('phone')->default('');
                    $blueprint->text('address')->default('');
                    $blueprint->text('notes')->default('');
                }
                if ($kind === 'warehouses') {
                    $blueprint->text('manager')->default('');
                    $blueprint->text('address')->default('');
                }
                $blueprint->boolean('archived')->default(false);
                $blueprint->timestampTz('created_at')->useCurrent();
                $blueprint->timestampTz('updated_at')->useCurrent();
                $blueprint->index(['company_id', 'target_module_id', 'target_feature_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('labo_stock_locations');
        Schema::dropIfExists('labo_stock_warehouses');
        Schema::dropIfExists('labo_stock_suppliers');
    }
};