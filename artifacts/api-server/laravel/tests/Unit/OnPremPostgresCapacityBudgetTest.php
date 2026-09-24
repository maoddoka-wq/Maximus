<?php

namespace Tests\Unit;

use App\Support\OnPremPostgresCapacityBudget;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class OnPremPostgresCapacityBudgetTest extends TestCase
{
    public function test_worker_pool_fits_inside_usable_postgres_connections(): void
    {
        $budget = OnPremPostgresCapacityBudget::calculate(
            maxConnections: 100,
            superuserReservedConnections: 3,
            phpWorkers: 40,
            otherConnectionReserve: 20,
        );

        $this->assertSame(97, $budget['usable_connections']);
        $this->assertSame(60, $budget['required_connections']);
        $this->assertSame(37, $budget['remaining_connections']);
        $this->assertTrue($budget['fits']);
    }

    public function test_worker_pool_fails_when_it_would_consume_the_database_budget(): void
    {
        $budget = OnPremPostgresCapacityBudget::calculate(
            maxConnections: 80,
            superuserReservedConnections: 3,
            phpWorkers: 60,
            otherConnectionReserve: 20,
        );

        $this->assertSame(-3, $budget['remaining_connections']);
        $this->assertFalse($budget['fits']);
    }

    public function test_invalid_worker_count_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);

        OnPremPostgresCapacityBudget::calculate(
            maxConnections: 100,
            superuserReservedConnections: 3,
            phpWorkers: 0,
            otherConnectionReserve: 20,
        );
    }
}
