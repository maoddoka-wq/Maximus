<?php

namespace Tests\Unit;

use App\Services\SubscriptionPricing;
use PHPUnit\Framework\TestCase;

class SubscriptionPricingTest extends TestCase
{
    public function test_module_total_and_automatic_plan_remain_visible_when_a_company_price_is_customized(): void
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
        $this->assertSame(45000, $result['autoPlan']['monthlyAmount']);
        $this->assertSame(27000, $result['customAmount']);
        $this->assertSame(27000, $result['payableAmount']);
    }

    public function test_missing_module_prices_are_explicit_without_changing_the_automatic_plan(): void
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
        $this->assertSame(45000, $result['payableAmount']);
        $this->assertNull($result['modules'][1]['monthlyAmount']);
    }

    public function test_automatic_plan_uses_existing_module_count_thresholds(): void
    {
        $pricing = new SubscriptionPricing();

        $this->assertSame(45000, $pricing->calculate(array_fill(0, 4, ['id' => 'x']), [], null)['payableAmount']);
        $this->assertSame(95000, $pricing->calculate(array_fill(0, 5, ['id' => 'x']), [], null)['payableAmount']);
        $this->assertSame(185000, $pricing->calculate(array_fill(0, 9, ['id' => 'x']), [], null)['payableAmount']);
    }
}