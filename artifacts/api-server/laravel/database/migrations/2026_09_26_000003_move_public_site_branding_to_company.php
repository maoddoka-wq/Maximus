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
            return;
        }

        Schema::table('company_public_sites', function (Blueprint $table): void {
            if (! Schema::hasColumn('company_public_sites', 'public_name')) {
                $table->string('public_name', 120)->nullable();
            }
            if (! Schema::hasColumn('company_public_sites', 'public_slug')) {
                $table->string('public_slug', 80)->nullable();
            }
            if (! Schema::hasColumn('company_public_sites', 'public_description')) {
                $table->string('public_description', 500)->nullable();
            }
            if (! Schema::hasColumn('company_public_sites', 'logo_url')) {
                $table->string('logo_url', 500)->nullable();
            }
            if (! Schema::hasColumn('company_public_sites', 'logo_data')) {
                $table->text('logo_data')->nullable();
            }
            if (! Schema::hasColumn('company_public_sites', 'logo_mime')) {
                $table->string('logo_mime', 120)->nullable();
            }
            if (! Schema::hasColumn('company_public_sites', 'primary_color')) {
                $table->string('primary_color', 7)->nullable();
            }
            if (! Schema::hasColumn('company_public_sites', 'accent_color')) {
                $table->string('accent_color', 7)->nullable();
            }
        });

        if (Schema::hasTable('ecommerce_stores')) {
            foreach (DB::table('ecommerce_stores')->whereNotNull('company_id')->get() as $store) {
                $values = [
                    'public_name' => $store->name,
                    'public_slug' => $store->slug,
                    'public_description' => $store->description ?? '',
                    'logo_url' => $store->logo_url ?? '',
                    'logo_data' => $store->logo_data ?? null,
                    'logo_mime' => $store->logo_mime ?? null,
                    'primary_color' => $store->primary_color ?? null,
                    'accent_color' => $store->accent_color ?? null,
                    'updated_at' => now(),
                ];
                $site = DB::table('company_public_sites')->where('company_id', $store->company_id)->first();
                if ($site) {
                    DB::table('company_public_sites')->where('company_id', $store->company_id)->update($values);
                } else {
                    DB::table('company_public_sites')->insert(array_merge([
                        'company_id' => $store->company_id,
                        'maximus_enabled' => false,
                        'company_enabled' => false,
                        'module_ids' => json_encode([], JSON_UNESCAPED_UNICODE),
                        'created_at' => now(),
                    ], $values));
                }

                if (Schema::hasTable('ecommerce_gallery_images')) {
                    DB::table('ecommerce_gallery_images')
                        ->where('company_id', $store->company_id)
                        ->where('owner_type', 'store')
                        ->where('owner_id', $store->id)
                        ->where('collection', 'hero')
                        ->update([
                            'owner_type' => 'company_site',
                            'owner_id' => $store->company_id,
                            'updated_at' => now(),
                        ]);
                }
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('ecommerce_stores') && Schema::hasTable('ecommerce_gallery_images')) {
            foreach (DB::table('ecommerce_stores')->whereNotNull('company_id')->get(['id', 'company_id']) as $store) {
                DB::table('ecommerce_gallery_images')
                    ->where('company_id', $store->company_id)
                    ->where('owner_type', 'company_site')
                    ->where('owner_id', $store->company_id)
                    ->where('collection', 'hero')
                    ->update([
                        'owner_type' => 'store',
                        'owner_id' => $store->id,
                        'updated_at' => now(),
                    ]);
            }
        }

        if (! Schema::hasTable('company_public_sites')) {
            return;
        }

        Schema::table('company_public_sites', function (Blueprint $table): void {
            foreach ([
                'public_name',
                'public_slug',
                'public_description',
                'logo_url',
                'logo_data',
                'logo_mime',
                'primary_color',
                'accent_color',
            ] as $column) {
                if (Schema::hasColumn('company_public_sites', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};