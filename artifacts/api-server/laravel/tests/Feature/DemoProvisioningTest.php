<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class DemoProvisioningTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_provisioning_covers_all_api_workflows_and_is_idempotent(): void
    {
        $this->provision();

        $counts = [
            'stock_products' => 5,
            'stock_movements' => 4,
            'stock_requests' => 1,
            'stock_inventories' => 1,
            'stock_inventory_lines' => 2,
            'control_tasks' => 3,
            'control_events' => 3,
            'control_audit_entries' => 3,
            'presence_items' => 6,
        ];

        foreach ($counts as $table => $count) {
            $this->assertDatabaseCount($table, $count);
        }

        $this->provision();

        foreach ($counts as $table => $count) {
            $this->assertDatabaseCount($table, $count);
        }
    }

    private function provision(): void
    {
        $this->assertSame(0, Artisan::call('maximus:provision-demo'));
    }
}
