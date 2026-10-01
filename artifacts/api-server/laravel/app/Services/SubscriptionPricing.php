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

    public function calculate(array $modules, array $modulePrices, ?int $customAmount): array
    {
        $plan = $this->planForCount(count($modules));
        $lines = [];
        $moduleTotal = 0;
        $moduleTotalIsComplete = true;

        foreach ($modules as $module) {
            $moduleId = (string) ($module['id'] ?? '');
            $price = $modulePrices[$moduleId] ?? null;
            if ($price === null) {
                $moduleTotalIsComplete = false;
            } else {
                $moduleTotal += (int) $price;
            }

            $lines[] = [
                'id' => $moduleId,
                'name' => (string) ($module['name'] ?? $moduleId),
                'monthlyAmount' => $price === null ? null : (int) $price,
            ];
        }

        return [
            'modules' => $lines,
            'moduleTotal' => $moduleTotalIsComplete ? $moduleTotal : null,
            'moduleTotalComplete' => $moduleTotalIsComplete,
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