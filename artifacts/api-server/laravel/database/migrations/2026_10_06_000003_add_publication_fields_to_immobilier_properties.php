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
            return;
        }

        Schema::table('immobilier_properties', function (Blueprint $table): void {
            if (! Schema::hasColumn('immobilier_properties', 'publication_title')) {
                $table->string('publication_title', 160)->nullable();
            }
            if (! Schema::hasColumn('immobilier_properties', 'publication_slug')) {
                $table->string('publication_slug')->nullable();
            }
            if (! Schema::hasColumn('immobilier_properties', 'publication_description')) {
                $table->text('publication_description')->nullable();
            }
            if (! Schema::hasColumn('immobilier_properties', 'publication_status')) {
                $table->string('publication_status', 20)->default('DRAFT');
            }
            if (! Schema::hasColumn('immobilier_properties', 'featured')) {
                $table->boolean('featured')->default(false);
            }
        });

        DB::table('immobilier_properties')
            ->orderBy('id')
            ->chunkById(100, function ($properties): void {
                foreach ($properties as $property) {
                    $listing = DB::table('immobilier_listings')
                        ->where('company_id', $property->company_id)
                        ->where('property_id', $property->id)
                        ->where('status', '!=', 'ARCHIVED')
                        ->orderByRaw("CASE WHEN status = 'PUBLISHED' THEN 0 ELSE 1 END")
                        ->orderByDesc('updated_at')
                        ->first();

                    $title = trim((string) ($listing?->title ?? $property->reference));
                    if ($title === '') {
                        $title = 'Bien immobilier';
                    }
                    $baseSlug = Str::slug((string) ($listing?->slug ?: $title)) ?: 'bien';
                    $slug = $baseSlug;
                    $suffix = 2;
                    while (DB::table('immobilier_properties')
                        ->where('company_id', $property->company_id)
                        ->where('publication_slug', $slug)
                        ->where('id', '!=', $property->id)
                        ->exists()) {
                        $slug = $baseSlug.'-'.$suffix++;
                    }

                    DB::table('immobilier_properties')
                        ->where('id', $property->id)
                        ->update([
                            'publication_title' => $title,
                            'publication_slug' => $slug,
                            'publication_description' => $listing?->description ?? '',
                            'publication_status' => $listing?->status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
                            'featured' => (bool) ($listing->featured ?? false),
                        ]);
                }
            });

        Schema::table('immobilier_properties', function (Blueprint $table): void {
            $table->unique(['company_id', 'publication_slug'], 'immobilier_properties_publication_slug_unique');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('immobilier_properties')) {
            return;
        }

        if (Schema::hasColumn('immobilier_properties', 'publication_slug')) {
            Schema::table('immobilier_properties', function (Blueprint $table): void {
                $table->dropUnique('immobilier_properties_publication_slug_unique');
            });
        }

        $columns = array_values(array_filter(
            ['publication_title', 'publication_slug', 'publication_description', 'publication_status', 'featured'],
            fn (string $column): bool => Schema::hasColumn('immobilier_properties', $column),
        ));

        if ($columns !== []) {
            Schema::table('immobilier_properties', function (Blueprint $table) use ($columns): void {
                $table->dropColumn($columns);
            });
        }
    }
};
