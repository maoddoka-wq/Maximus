<?php

namespace Tests\Unit;

use App\Services\SubscriptionPricing;
use PHPUnit\Framework\TestCase;

class SubscriptionPricingTest extends TestCase
{
    public function test_module_grid_total_is_used_unless_a_company_price_is_customized(): void
    {
        $result = (new SubscriptionPricing())->calculate(
            [
                ['id' => 'commerce', 'name' => 'Commerce'],
                ['id' => 'stocks', 'name' => 'Stocks'],
            ],
            ['commerce' => 12000, 'stocks' => 8000],
            27000,
        );

        $this->assertSame(20000, $result['moduleTotal']);
        $this->assertTrue($result['moduleTotalComplete']);
        $this->assertSame(27000, $result['customAmount']);
        $this->assertSame(27000, $result['payableAmount']);

        $withoutOverride = (new SubscriptionPricing())->calculate(
            [
                ['id' => 'commerce', 'name' => 'Commerce'],
                ['id' => 'stocks', 'name' => 'Stocks'],
            ],
            ['commerce' => 12000, 'stocks' => 8000],
            null,
        );
        $this->assertSame(20000, $withoutOverride['payableAmount']);
    }

    public function test_missing_module_price_leaves_the_calculated_total_unavailable(): void
    {
        $result = (new SubscriptionPricing())->calculate(
            [
                ['id' => 'commerce', 'name' => 'Commerce'],
                ['id' => 'stocks', 'name' => 'Stocks'],
            ],
            ['commerce' => 12000],
            null,
        );

        $this->assertNull($result['moduleTotal']);
        $this->assertFalse($result['moduleTotalComplete']);
        $this->assertNull($result['payableAmount']);
        $this->assertNull($result['modules'][1]['monthlyAmount']);
    }

    public function test_custom_amount_can_be_used_while_a_module_price_is_missing(): void
    {
        $result = (new SubscriptionPricing())->calculate(
            [
                ['id' => 'commerce', 'name' => 'Commerce'],
                ['id' => 'stocks', 'name' => 'Stocks'],
            ],
            ['commerce' => 12000],
            18000,
        );

        $this->assertNull($result['moduleTotal']);
        $this->assertSame(18000, $result['payableAmount']);
    }
}