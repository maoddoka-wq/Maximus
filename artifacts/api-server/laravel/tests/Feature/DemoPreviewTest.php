<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\TestCase;

class DemoPreviewTest extends TestCase
{
    public function test_demo_preview_is_not_available_outside_the_local_environment(): void
    {
        $this->app['env'] = 'production';
        DB::shouldReceive('connection')->never();

        $this->getJson('/api/preview/ana')->assertNotFound();
    }

    public function test_demo_preview_requires_the_replit_development_database(): void
    {
        $this->app['env'] = 'local';
        $connection = new class {
            public function getDatabaseName(): string
            {
                return 'maximus-production';
            }
        };

        DB::shouldReceive('connection')->once()->andReturn($connection);
        DB::shouldReceive('table')->never();

        $this->getJson('/api/preview/ana')->assertNotFound();
    }

    public function test_local_preview_reads_the_ana_scope_without_a_login(): void
    {
        $this->app['env'] = 'local';
        $connection = new class {
            public function getDatabaseName(): string
            {
                return 'heliumdb';
            }
        };
        $query = Mockery::mock();
        $query->shouldReceive('where')->once()->with('scope', 'demo-preview:ana')->andReturnSelf();
        $query->shouldReceive('first')->once()->andReturn((object) [
            'payload' => json_encode([
                'company' => ['id' => 'demo-ana', 'name' => 'ANA'],
                'profiles' => [],
            ]),
        ]);

        DB::shouldReceive('connection')->once()->andReturn($connection);
        DB::shouldReceive('table')->once()->with('maximus_app_states')->andReturn($query);

        $this->getJson('/api/preview/ana')
            ->assertOk()
            ->assertJsonPath('company.name', 'ANA')
            ->assertJsonPath('readOnly', true);
    }
}