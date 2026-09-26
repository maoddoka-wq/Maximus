<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Collection;
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

        foreach ($this->canonicalStores() as $companyId => $store) {
            $companyId = (string) $companyId;
            $values = [
                'public_name' => $store->name,
                'public_slug' => $store->slug,
                'public_description' => $store->description ?? '',
                'logo_url' => $store->logo_url ?? '',
                'logo_data' => $store->logo_data ?? null,
                'logo_mime' => $store->logo_mime ?? null,
                'primary_color' => $store->primary_color ?? null,
                'accent_color' => $store->accent_color ?? null,
            ];
            $site = DB::table('company_public_sites')->where('company_id', $companyId)->first();
            if ($site) {
                $missingValues = [];
                foreach ($values as $column => $value) {
                    if ($site->{$column} === null) {
                        $missingValues[$column] = $value;
                    }
                }
                if ($missingValues !== []) {
                    DB::table('company_public_sites')->where('company_id', $companyId)->update([
                        ...$missingValues,
                        'updated_at' => now(),
                    ]);
                }
            } else {
                DB::table('company_public_sites')->insert(array_merge([
                    'company_id' => $companyId,
                    'maximus_enabled' => false,
                    'company_enabled' => false,
                    'module_ids' => json_encode([], JSON_UNESCAPED_UNICODE),
                    'created_at' => now(),
                    'updated_at' => now(),
                ], $values));
            }

            if (Schema::hasTable('ecommerce_gallery_images')) {
                $hasCompanyHero = DB::table('ecommerce_gallery_images')
                    ->where('company_id', $companyId)
                    ->where('owner_type', 'company_site')
                    ->where('owner_id', $companyId)
                    ->where('collection', 'hero')
                    ->exists();

                if (! $hasCompanyHero) {
                    DB::table('ecommerce_gallery_images')
                        ->where('company_id', $companyId)
                        ->where('owner_type', 'store')
                        ->where('owner_id', $store->id)
                        ->where('collection', 'hero')
                        ->update([
                            'owner_type' => 'company_site',
                            'owner_id' => $companyId,
                            'updated_at' => now(),
                        ]);
                }
            }
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('company_public_sites') || ! Schema::hasTable('ecommerce_stores')) {
            return;
        }

        foreach ($this->canonicalStores() as $companyId => $store) {
            $companyId = (string) $companyId;
            $site = DB::table('company_public_sites')->where('company_id', $companyId)->first();
            if ($site) {
                DB::table('ecommerce_stores')->where('id', $store->id)->update([
                    'name' => $site->public_name ?? $store->name,
                    'slug' => $site->public_slug ?? $store->slug,
                    'description' => $site->public_description ?? $store->description,
                    'logo_url' => $site->logo_url ?? $store->logo_url,
                    'logo_data' => $site->logo_data ?? $store->logo_data,
                    'logo_mime' => $site->logo_mime ?? $store->logo_mime,
                    'primary_color' => $site->primary_color ?? $store->primary_color,
                    'accent_color' => $site->accent_color ?? $store->accent_color,
                    'updated_at' => now(),
                ]);
            }

            if (Schema::hasTable('ecommerce_gallery_images')) {
                DB::table('ecommerce_gallery_images')
                    ->where('company_id', $companyId)
                    ->where('owner_type', 'company_site')
                    ->where('owner_id', $companyId)
                    ->where('collection', 'hero')
                    ->update([
                        'owner_type' => 'store',
                        'owner_id' => $store->id,
                        'updated_at' => now(),
                    ]);
                }
        }

        // Keep the additive columns: companies without an E-commerce store may
        // already have edited company-owned branding that has no legacy target.
    }

    private function canonicalStores(): Collection
    {
        if (! Schema::hasTable('ecommerce_stores')) {
            return collect();
        }

        return DB::table('ecommerce_stores')
            ->whereNotNull('company_id')
            ->orderByRaw("CASE WHEN status = 'PUBLISHED' THEN 0 ELSE 1 END")
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->groupBy('company_id')
            ->map(fn (Collection $stores) => $stores->first());
    }
};