<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class DemoProvisioningTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_provisioning_does_not_create_business_data(): void
    {
        $this->provision();

        $counts = [
            'auth_users' => 0,
            'stock_products' => 0,
            'stock_movements' => 0,
            'stock_requests' => 0,
            'stock_inventories' => 0,
            'stock_inventory_lines' => 0,
            'control_tasks' => 0,
            'control_events' => 0,
            'control_audit_entries' => 0,
            'presence_items' => 0,
        ];

        foreach ($counts as $table => $count) {
            $this->assertDatabaseCount($table, $count);
        }

        $this->assertDatabaseHas('maximus_modules', ['id' => 'commerce']);
    }

    private function provision(): void
    {
        $this->assertSame(0, Artisan::call('maximus:provision-demo'));
    }
}
