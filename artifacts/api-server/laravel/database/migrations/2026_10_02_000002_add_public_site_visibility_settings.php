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
            return;
        }

        Schema::table('company_public_site_access', function (Blueprint $table): void {
            if (! Schema::hasColumn('company_public_site_access', 'homepage_enabled')) {
                $table->boolean('homepage_enabled')->default(true);
            }
            if (! Schema::hasColumn('company_public_site_access', 'banner_enabled')) {
                $table->boolean('banner_enabled')->default(true);
            }
        });

        DB::table('ecommerce_stores')
            ->select(['company_id', 'homepage_enabled'])
            ->orderBy('company_id')
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->unique('company_id')
            ->each(function (object $store): void {
                $exists = DB::table('company_public_site_access')
                    ->where('company_id', $store->company_id)
                    ->exists();
                if ($exists) {
                    DB::table('company_public_site_access')
                        ->where('company_id', $store->company_id)
                        ->update([
                            'homepage_enabled' => (bool) ($store->homepage_enabled ?? true),
                            'updated_at' => now(),
                        ]);
                    return;
                }

                DB::table('company_public_site_access')->insert([
                    'company_id' => $store->company_id,
                    'enabled' => false,
                    'homepage_enabled' => (bool) ($store->homepage_enabled ?? true),
                    'banner_enabled' => true,
                    'updated_by' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
    }

    public function down(): void
    {
        if (! Schema::hasTable('company_public_site_access')) {
            return;
        }

        if (Schema::hasColumn('company_public_site_access', 'homepage_enabled')) {
            DB::table('ecommerce_stores')
                ->join('company_public_site_access', 'company_public_site_access.company_id', '=', 'ecommerce_stores.company_id')
                ->update([
                    'ecommerce_stores.homepage_enabled' => DB::raw('company_public_site_access.homepage_enabled'),
                ]);
        }

        Schema::table('company_public_site_access', function (Blueprint $table): void {
            $columns = [];
            if (Schema::hasColumn('company_public_site_access', 'homepage_enabled')) {
                $columns[] = 'homepage_enabled';
            }
            if (Schema::hasColumn('company_public_site_access', 'banner_enabled')) {
                $columns[] = 'banner_enabled';
            }
            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};