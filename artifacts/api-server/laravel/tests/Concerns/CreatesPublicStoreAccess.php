<?php

namespace Tests\Concerns;

use Illuminate\Support\Facades\DB;

trait CreatesPublicStoreAccess
{
    /** A published store and MAXIMUS authorization are distinct prerequisites. */
    protected function authorizePublicStore(string $companyId): void
    {
        DB::table('company_public_site_access')->updateOrInsert(
            ['company_id' => $companyId],
            ['enabled' => true, 'created_at' => now(), 'updated_at' => now()],
        );
    }
}
