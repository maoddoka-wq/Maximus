<?php

namespace App\Services;

final class SubscriptionPricing
{
    private const PLANS = [
        [
            'id' => 'essential',
            'name' => 'Essentiel',
            'monthlyAmount' => 45000,
            'moduleLimit' => 4,
        ],
        [
            'id' => 'growth',
            'name' => 'Croissance',
            'monthlyAmount' => 95000,
            'moduleLimit' => 8,
        ],
        [
            'id' => 'scale',
            'name' => 'Scale',
            'monthlyAmount' => 185000,
            'moduleLimit' => 14,
        ],
    ];

    public function calculate(array $modules, ?int $customAmount): array
    {
        $plan = $this->planForCount(count($modules));

        return [
            'modules' => array_map(static fn (array $module): array => [
                'id' => (string) ($module['id'] ?? ''),
                'name' => (string) ($module['name'] ?? $module['id'] ?? ''),
            ], $modules),
            'autoPlan' => $plan,
            'customAmount' => $customAmount,
            'payableAmount' => $customAmount ?? $plan['monthlyAmount'],
        ];
    }

    private function planForCount(int $moduleCount): array
    {
        foreach (self::PLANS as $plan) {
            if ($moduleCount <= $plan['moduleLimit']) {
                return $plan;
            }
        }

        return self::PLANS[array_key_last(self::PLANS)];
    }
}